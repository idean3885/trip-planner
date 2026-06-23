"""Unit tests for web_client.py — Device Authorization Grant (spec 060, #793)."""
import os
from unittest.mock import AsyncMock, patch

import pytest
from pytest_httpx import HTTPXMock

import trip_mcp.web_client as wc

BASE = "https://trip.idean.me"


def _start_response(httpx_mock: HTTPXMock, interval: int = 0):
    httpx_mock.add_response(
        method="POST",
        url=f"{BASE}/api/auth/device/start",
        json={
            "device_code": "dc-secret",
            "user_code": "ABCD-EFGH",
            "verification_uri": f"{BASE}/device",
            "verification_uri_complete": f"{BASE}/device?user_code=ABCD-EFGH",
            "expires_in": 600,
            "interval": interval,  # 0 → 테스트 즉시
        },
    )


class TestDeviceFlow:
    async def test_success_after_pending(self, httpx_mock: HTTPXMock):
        """pending 후 승인되면 토큰을 자동 수신한다."""
        _start_response(httpx_mock)
        httpx_mock.add_response(
            method="POST",
            url=f"{BASE}/api/auth/device/token",
            status_code=400,
            json={"error": "authorization_pending"},
        )
        httpx_mock.add_response(
            method="POST",
            url=f"{BASE}/api/auth/device/token",
            status_code=200,
            json={"access_token": "tp_device", "token_type": "bearer"},
        )
        token = await wc._authenticate_via_device()
        assert token == "tp_device"

    async def test_denied_returns_none(self, httpx_mock: HTTPXMock):
        """거부되면 None(종료), 토큰 없음."""
        _start_response(httpx_mock)
        httpx_mock.add_response(
            method="POST",
            url=f"{BASE}/api/auth/device/token",
            status_code=400,
            json={"error": "access_denied"},
        )
        assert await wc._authenticate_via_device() is None

    async def test_expired_returns_none(self, httpx_mock: HTTPXMock):
        """만료되면 None(종료)."""
        _start_response(httpx_mock)
        httpx_mock.add_response(
            method="POST",
            url=f"{BASE}/api/auth/device/token",
            status_code=400,
            json={"error": "expired_token"},
        )
        assert await wc._authenticate_via_device() is None

    async def test_slow_down_then_success(self, httpx_mock: HTTPXMock):
        """slow_down 신호를 따른 뒤 승인 토큰 수신."""
        _start_response(httpx_mock)
        httpx_mock.add_response(
            method="POST",
            url=f"{BASE}/api/auth/device/token",
            status_code=400,
            json={"error": "slow_down", "interval": 0},
        )
        httpx_mock.add_response(
            method="POST",
            url=f"{BASE}/api/auth/device/token",
            status_code=200,
            json={"access_token": "tp_slow_ok"},
        )
        assert await wc._authenticate_via_device() == "tp_slow_ok"


class TestDispatch:
    async def test_env_routes_to_device(self):
        """TRIP_DEVICE_AUTH 설정 시 loopback 대신 device 흐름을 쓴다."""
        with patch.dict(os.environ, {"TRIP_DEVICE_AUTH": "1"}):
            with patch.object(
                wc, "_authenticate_via_device", new_callable=AsyncMock
            ) as mock_device:
                mock_device.return_value = "tp_from_device"
                token = await wc._authenticate_via_browser()
        mock_device.assert_awaited_once()
        assert token == "tp_from_device"

    async def test_no_env_uses_loopback(self):
        """env 미설정이면 기존 loopback(회귀 없음)."""
        os.environ.pop("TRIP_DEVICE_AUTH", None)
        with patch.object(
            wc, "_run_callback_server", return_value="tp_loopback"
        ):
            token = await wc._authenticate_via_browser()
        assert token == "tp_loopback"
