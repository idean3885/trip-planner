"""trip-planner 웹 API 클라이언트 (PAT 인증 + 자동 재인증)."""

import asyncio
import http.server
import logging
import os
import platform
import secrets
import socketserver
import subprocess
import urllib.parse
import webbrowser
from typing import Any, Optional

logger = logging.getLogger("trip-mcp-server")

KEYCHAIN_SERVICE = "trip-planner"
KEYCHAIN_ACCOUNT_PAT = "api-pat"

DEFAULT_BASE_URL = "https://trip.idean.me"

# 동시 재인증 방지용 Lock
_reauth_lock = asyncio.Lock()


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


def _save_keychain_pat(token: str) -> bool:
    """macOS 키체인에 PAT를 저장(갱신)한다."""
    if platform.system() != "Darwin":
        return False
    try:
        subprocess.run(
            ["/usr/bin/security", "delete-generic-password",
             "-s", KEYCHAIN_SERVICE, "-a", KEYCHAIN_ACCOUNT_PAT],
            capture_output=True, timeout=5,
        )
    except Exception:
        pass
    try:
        subprocess.run(
            ["/usr/bin/security", "add-generic-password",
             "-s", KEYCHAIN_SERVICE, "-a", KEYCHAIN_ACCOUNT_PAT, "-w", token],
            capture_output=True, timeout=5, check=True,
        )
        return True
    except Exception:
        logger.warning("키체인에 토큰 저장 실패")
        return False


import httpx

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


def _recreate_client(token: str) -> None:
    """새 토큰으로 HTTP 클라이언트를 재생성한다."""
    global _client, TRIP_PLANNER_PAT
    TRIP_PLANNER_PAT = token
    _client = None  # 다음 get_client() 호출 시 새로 생성


def _run_callback_server(state: str, base_url: str) -> Optional[str]:
    """localhost HTTP 서버를 기동하고 브라우저 인증 콜백을 수신한다. (블로킹)"""

    class CallbackHandler(http.server.BaseHTTPRequestHandler):
        token: Optional[str] = None

        def do_GET(self) -> None:
            parsed = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(parsed.query)
            if parsed.path == "/callback":
                received_state = params.get("state", [""])[0]
                if received_state != state:
                    self.send_response(400)
                    self.end_headers()
                    self.wfile.write(b"State mismatch")
                    return
                CallbackHandler.token = params.get("token", [""])[0]
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                html = (
                    '<html><body style="font-family:system-ui;text-align:center;padding:60px">'
                    "<h1>인증 완료!</h1><p>이 창을 닫아도 됩니다.</p></body></html>"
                )
                self.wfile.write(html.encode())
            else:
                self.send_response(404)
                self.end_headers()

        def log_message(self, format: str, *args: Any) -> None:
            pass  # 로그 억제

    with socketserver.TCPServer(("127.0.0.1", 0), CallbackHandler) as server:
        port = server.server_address[1]
        url = f"{base_url}/api/auth/cli?port={port}&state={state}"
        webbrowser.open(url)
        server.timeout = 120
        server.handle_request()
        return CallbackHandler.token or None


async def _authenticate_via_browser() -> Optional[str]:
    """브라우저 OAuth로 새 토큰을 발급받는다. 성공 시 토큰 문자열, 실패 시 None."""
    state = secrets.token_hex(16)
    loop = asyncio.get_event_loop()
    try:
        token = await asyncio.wait_for(
            loop.run_in_executor(None, _run_callback_server, state, TRIP_PLANNER_URL),
            timeout=130.0,  # 서버 타임아웃(120) + 여유
        )
        return token
    except (asyncio.TimeoutError, Exception) as e:
        logger.warning(f"브라우저 재인증 실패: {e}")
        return None


async def api_request(
    method: str,
    path: str,
    json: Any = None,
    params: dict | None = None,
) -> dict:
    """웹 API 호출. 성공 시 JSON dict, 실패 시 {"error": ...} 반환."""
    # PAT 미설정 시 브라우저 인증 시도
    if not TRIP_PLANNER_PAT:
        logger.info("PAT 미설정. 브라우저 인증을 시도합니다...")
        async with _reauth_lock:
            if not TRIP_PLANNER_PAT:  # double-check
                new_token = await _authenticate_via_browser()
                if new_token:
                    _save_keychain_pat(new_token)
                    _recreate_client(new_token)
                else:
                    return {"error": "TRIP_PLANNER_PAT가 설정되지 않았습니다. 웹사이트 설정 페이지에서 토큰을 생성하세요."}

    client = get_client()
    try:
        response = await client.request(method, path, json=json, params=params)

        # 401 → 자동 재인증
        if response.status_code == 401:
            async with _reauth_lock:
                # Lock 획득 후 이미 다른 요청이 갱신했는지 확인
                current_client = get_client()
                if current_client is not client:
                    # 이미 갱신됨 — 새 클라이언트로 재시도
                    retry = await current_client.request(method, path, json=json, params=params)
                    retry.raise_for_status()
                    return retry.json()

                logger.info("401 응답. 브라우저 재인증을 시도합니다...")
                new_token = await _authenticate_via_browser()
                if new_token:
                    _save_keychain_pat(new_token)
                    _recreate_client(new_token)
                    # 새 클라이언트로 재시도
                    retry = await get_client().request(method, path, json=json, params=params)
                    retry.raise_for_status()
                    return retry.json()
                else:
                    return {"error": "재인증에 실패했습니다. 웹사이트에서 수동으로 토큰을 생성하세요."}

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
