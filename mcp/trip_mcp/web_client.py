"""trip-planner 웹 API 클라이언트 (PAT 인증)."""

import httpx
import logging
import os
import platform
import subprocess
from typing import Any, Optional

logger = logging.getLogger("trip-mcp-server")

KEYCHAIN_SERVICE = "trip-planner"
KEYCHAIN_ACCOUNT_PAT = "api-pat"

DEFAULT_BASE_URL = "https://trip.idean.me"


def _read_keychain_pat() -> Optional[str]:
    """macOS 키체인에서 PAT를 읽는다."""
    if platform.system() != "Darwin":
        return None
    try:
        result = subprocess.run(
            ["/usr/bin/security", "find-generic-password",
             "-s", KEYCHAIN_SERVICE, "-a", KEYCHAIN_ACCOUNT_PAT, "-w"],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass
    return None


TRIP_PLANNER_PAT = _read_keychain_pat() or os.getenv("TRIP_PLANNER_PAT", "")
TRIP_PLANNER_URL = os.getenv("TRIP_PLANNER_URL", DEFAULT_BASE_URL)

_client: Optional[httpx.AsyncClient] = None


def get_client() -> httpx.AsyncClient:
    """PAT 인증이 설정된 공유 HTTP 클라이언트를 반환한다."""
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            base_url=TRIP_PLANNER_URL,
            headers={"Authorization": f"Bearer {TRIP_PLANNER_PAT}"},
            timeout=30.0,
        )
    return _client


async def api_request(
    method: str,
    path: str,
    json: Any = None,
    params: dict | None = None,
) -> dict:
    """웹 API 호출. 성공 시 JSON dict, 실패 시 {"error": ...} 반환."""
    if not TRIP_PLANNER_PAT:
        return {"error": "TRIP_PLANNER_PAT가 설정되지 않았습니다. 웹사이트 설정 페이지에서 토큰을 생성하세요."}

    client = get_client()
    try:
        response = await client.request(method, path, json=json, params=params)

        if response.status_code == 401:
            return {"error": "인증이 만료되었습니다. 웹사이트에서 새 토큰을 생성하세요."}
        if response.status_code == 403:
            return {"error": "이 작업에 대한 권한이 없습니다 (HOST 이상 필요)."}

        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as e:
        logger.error(f"API error: {e.response.status_code} {e.response.text}")
        return {"error": f"API 오류 ({e.response.status_code}): {e.response.text[:200]}"}
    except httpx.RequestError as e:
        logger.error(f"Request error: {e}")
        return {"error": f"연결 오류: {str(e)[:200]}"}
