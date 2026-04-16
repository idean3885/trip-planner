"""Unit tests for web_client.py — 재인증 로직."""
import asyncio
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
import httpx
from pytest_httpx import HTTPXMock

import trip_mcp.web_client as wc


@pytest.fixture(autouse=True)
def reset_client():
    """각 테스트 전후로 모듈 상태 초기화."""
    original_pat = wc.TRIP_PLANNER_PAT
    original_client = wc._client
    wc.TRIP_PLANNER_PAT = "tp_test_token"
    wc._client = None
    yield
    wc.TRIP_PLANNER_PAT = original_pat
    wc._client = original_client


class TestSaveKeychainPat:
    """_save_keychain_pat 테스트."""

    @patch("trip_mcp.web_client.platform")
    def test_skips_on_non_darwin(self, mock_platform):
        mock_platform.system.return_value = "Linux"
        assert wc._save_keychain_pat("tp_new") is False

    @patch("trip_mcp.web_client.platform")
    @patch("trip_mcp.web_client.subprocess")
    def test_saves_on_darwin(self, mock_subprocess, mock_platform):
        mock_platform.system.return_value = "Darwin"
        mock_subprocess.run.return_value = MagicMock(returncode=0)
        assert wc._save_keychain_pat("tp_new") is True
        # delete + add = 2 calls
        assert mock_subprocess.run.call_count == 2


class TestRecreateClient:
    """_recreate_client 테스트."""

    def test_updates_pat_and_clears_client(self):
        wc._client = MagicMock()
        wc._recreate_client("tp_new_token")
        assert wc.TRIP_PLANNER_PAT == "tp_new_token"
        assert wc._client is None

    def test_get_client_uses_new_token(self):
        wc._recreate_client("tp_fresh")
        client = wc.get_client()
        assert client.headers["authorization"] == "Bearer tp_fresh"
        wc._client = None  # cleanup


class TestApiRequestReauth:
    """api_request의 401 재인증 로직 테스트."""

    async def test_401_triggers_browser_reauth(self, httpx_mock: HTTPXMock):
        """401 응답 시 브라우저 재인증을 시도한다."""
        httpx_mock.add_response(status_code=401)
        httpx_mock.add_response(json={"ok": True})

        with patch.object(wc, "_authenticate_via_browser", new_callable=AsyncMock) as mock_auth:
            mock_auth.return_value = "tp_refreshed"
            with patch.object(wc, "_save_keychain_pat") as mock_save:
                result = await wc.api_request("GET", "/api/trips")

        mock_auth.assert_called_once()
        mock_save.assert_called_once_with("tp_refreshed")
        assert result == {"ok": True}

    async def test_401_reauth_failure_returns_error(self, httpx_mock: HTTPXMock):
        """재인증 실패 시 에러 dict를 반환한다."""
        httpx_mock.add_response(status_code=401)

        with patch.object(wc, "_authenticate_via_browser", new_callable=AsyncMock) as mock_auth:
            mock_auth.return_value = None
            result = await wc.api_request("GET", "/api/trips")

        assert "error" in result
        assert "재인증" in result["error"]

    async def test_403_returns_permission_error(self, httpx_mock: HTTPXMock):
        """403 응답은 권한 에러를 반환한다."""
        httpx_mock.add_response(status_code=403)

        result = await wc.api_request("GET", "/api/trips/1")
        assert "error" in result
        assert "권한" in result["error"]

    async def test_successful_request_no_reauth(self, httpx_mock: HTTPXMock):
        """정상 응답 시 재인증을 시도하지 않는다."""
        httpx_mock.add_response(json={"trips": []})

        with patch.object(wc, "_authenticate_via_browser", new_callable=AsyncMock) as mock_auth:
            result = await wc.api_request("GET", "/api/trips")

        mock_auth.assert_not_called()
        assert result == {"trips": []}


class TestEmptyPatAuth:
    """PAT 미설정 시 초기 인증 테스트."""

    async def test_empty_pat_triggers_browser_auth(self, httpx_mock: HTTPXMock):
        """PAT가 비어있으면 브라우저 인증을 시도한다."""
        wc.TRIP_PLANNER_PAT = ""
        wc._client = None
        httpx_mock.add_response(json={"trips": []})

        with patch.object(wc, "_authenticate_via_browser", new_callable=AsyncMock) as mock_auth:
            mock_auth.return_value = "tp_new_from_browser"
            with patch.object(wc, "_save_keychain_pat"):
                result = await wc.api_request("GET", "/api/trips")

        mock_auth.assert_called_once()
        assert result == {"trips": []}

    async def test_empty_pat_auth_failure_returns_error(self):
        """PAT 미설정 + 브라우저 인증 실패 시 에러를 반환한다."""
        wc.TRIP_PLANNER_PAT = ""
        wc._client = None

        with patch.object(wc, "_authenticate_via_browser", new_callable=AsyncMock) as mock_auth:
            mock_auth.return_value = None
            result = await wc.api_request("GET", "/api/trips")

        assert "error" in result
        assert "TRIP_PLANNER_PAT" in result["error"]
