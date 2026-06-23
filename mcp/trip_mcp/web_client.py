"""trip-planner 웹 API 클라이언트 (PAT 인증 + 자동 재인증)."""

import asyncio
import http.server
import logging
import os
import platform
import secrets
import socketserver
import subprocess
import time
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


# 토큰을 fragment(#)로 받기 위한 relay 페이지. /bootstrap 이 토큰을
# 127.0.0.1:PORT/callback#token=...&state=... 로 redirect 하므로 서버는
# fragment 를 볼 수 없다. /callback 은 이 HTML 을 응답하고, 브라우저 JS 가
# location.hash 를 query 로 바꿔 POST /token 으로 다시 보낸다(서버 로그·
# referrer 에 토큰 미노출 — query redirect 대비 보안 우위).
_RELAY_HTML = (
    "<!doctype html><meta charset=utf-8><title>trip-planner</title>"
    "<script>var f=location.hash.substring(1);"
    'fetch("/token?"+f,{method:"POST"})'
    ".then(function(r){document.body.textContent="
    '"인증 완료! 이 창을 닫아도 됩니다.";})'
    '.catch(function(){document.body.textContent="오류. 다시 시도해 주세요.";});'
    "</script><body>처리 중...</body>"
).encode()


def _run_callback_server(state: str, base_url: str) -> Optional[str]:
    """localhost HTTP 서버를 기동하고 브라우저 인증 콜백을 수신한다. (블로킹)

    /bootstrap(fragment) 흐름: GET /callback → relay HTML 응답 → 브라우저 JS 가
    fragment 를 POST /token 으로 전달. state 검증 + tp_ prefix 검증 후 토큰 보관.
    """

    class CallbackHandler(http.server.BaseHTTPRequestHandler):
        token: Optional[str] = None
        done: bool = False  # /token 처리 완료(성공·실패 무관) → 루프 종료

        def _reply(self, code: int, body: bytes, ctype: str = "text/plain") -> None:
            self.send_response(code)
            self.send_header("Content-Type", f"{ctype}; charset=utf-8")
            self.end_headers()
            if body:
                self.wfile.write(body)

        def do_GET(self) -> None:
            parsed = urllib.parse.urlparse(self.path)
            if parsed.path == "/callback":
                self._reply(200, _RELAY_HTML, "text/html")
            else:
                self._reply(404, b"")

        def do_POST(self) -> None:
            parsed = urllib.parse.urlparse(self.path)
            if parsed.path != "/token":
                self._reply(404, b"")
                return
            CallbackHandler.done = True  # 단발 콜백 — 성공/실패 모두 즉시 종결
            params = urllib.parse.parse_qs(parsed.query)
            if params.get("state", [""])[0] != state:
                self._reply(400, b"state_mismatch")
                return
            token = params.get("token", [""])[0]
            if not token.startswith("tp_"):
                self._reply(400, b"invalid_token")
                return
            CallbackHandler.token = token
            self._reply(200, b"ok")

        def log_message(self, format: str, *args: Any) -> None:
            pass  # 로그 억제

    # oauth-listener.mjs 와 동일 env 로 timeout 통일(기본 120초).
    timeout_sec = int(os.environ.get("TRIP_BOOTSTRAP_TIMEOUT_SEC", "120"))
    with socketserver.TCPServer(("127.0.0.1", 0), CallbackHandler) as server:
        port = server.server_address[1]
        url = f"{base_url}/bootstrap?port={port}&state={state}"
        webbrowser.open(url)
        # GET /callback 후 POST /token 까지 다단계 — 종결(토큰 수신·실패) 또는 timeout 까지 반복.
        deadline = time.monotonic() + timeout_sec
        while not CallbackHandler.done:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                break
            server.timeout = remaining
            server.handle_request()
        return CallbackHandler.token or None


async def _authenticate_via_device() -> Optional[str]:
    """Device Authorization Grant 인증 (spec 060, #793).

    브라우저-리스너 co-location(loopback)이 불가한 헤드리스 환경용. 개시 →
    사용자에게 승인 주소 안내 → 폴링으로 토큰 자동 수신. loopback 포트 미사용.
    """
    base = TRIP_PLANNER_URL
    try:
        async with httpx.AsyncClient(base_url=base, timeout=30.0) as client:
            started = await client.post("/api/auth/device/start")
            started.raise_for_status()
            d = started.json()
            device_code = d["device_code"]
            interval = int(d.get("interval", 5))
            expires_in = int(d.get("expires_in", 600))
            logger.warning(
                "헤드리스 인증이 필요합니다. 아래 주소를 기기에서 열어 "
                "본인 계정으로 승인하세요 (코드 %s):\n  %s",
                d.get("user_code"),
                d.get("verification_uri_complete"),
            )
            deadline = time.monotonic() + expires_in
            while time.monotonic() < deadline:
                await asyncio.sleep(interval)
                poll = await client.post(
                    "/api/auth/device/token", json={"device_code": device_code}
                )
                if poll.status_code == 200:
                    return poll.json().get("access_token")
                err = ""
                try:
                    payload = poll.json()
                    err = payload.get("error", "")
                except Exception:
                    payload = {}
                if err == "authorization_pending":
                    continue
                if err == "slow_down":
                    interval = int(payload.get("interval", interval + 5))
                    continue
                if err in ("access_denied", "expired_token"):
                    logger.warning("헤드리스 인증 종료: %s", err)
                    return None
                # 알 수 없는 응답 — 안전하게 종료
                logger.warning("헤드리스 인증 예기치 못한 응답: %s", err or poll.status_code)
                return None
            logger.warning("헤드리스 인증 타임아웃")
            return None
    except Exception as e:
        logger.warning(f"헤드리스 인증 실패: {e}")
        return None


async def _authenticate_via_browser() -> Optional[str]:
    """브라우저 OAuth로 새 토큰을 발급받는다. 성공 시 토큰 문자열, 실패 시 None.

    spec 060 — 헤드리스 환경(TRIP_DEVICE_AUTH 설정 시)에서는 loopback 대신 device
    흐름을 사용한다. 기본은 기존 loopback(회귀 없음).
    """
    if os.environ.get("TRIP_DEVICE_AUTH"):
        return await _authenticate_via_device()
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

        # 401 → 자동 재인증 (single-flight).
        # spec 059 — 자동 발급 토큰은 단기 만료(30일)를 가진다. 만료된 토큰은
        # 서버가 401 을 돌려주므로 만료도 이 경로로 자동 재로그인되어 끊김 없이
        # 원 요청을 재시도한다. 일반(비-MCP) 소비자는 401 시 auth-login 재실행.
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
