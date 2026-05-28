#!/usr/bin/env bash
# spec 030 T001/T007/T008 — trip-planner MCP v3 1줄 부트스트랩.
#
# 진입:
#   curl -fsSL https://trip.idean.me/install | bash
#
# 흐름:
#   1. 런타임(Node 20+, Python 3.10+, uv) 진단
#   2. trip-planner-mcp 패키지 설치(uv tool install)
#   3. OAuth listener 실행(localhost) → 브라우저 1회 인증 → PAT 자동 수령
#   4. macOS Keychain 에 PAT 저장 + 환경변수 export
#   5. MCP 클라이언트 등록(`claude mcp add -s user trip ...`) — Cursor·Desktop
#      은 향후 spec 030 patch 에서 추가
#   6. 동작 검증 ping(`trip_mcp/__main__.py --verify` 또는 list_trips MCP 1건)
#
# 표준 종료 코드:
#   0 — 성공
#   1 — 일반 실패
#   2 — 인증 실패(OAuth timeout/state mismatch)
#   3 — 의존성 부족(Node·런타임·uv 미설치)
#   4 — MCP 등록 실패(claude CLI 미설치)
set -euo pipefail

BASE_URL="${TRIP_BOOTSTRAP_BASE_URL:-https://trip.idean.me}"
LISTENER_URL="$BASE_URL/install/oauth-listener"
SERVICE_NAME="${TRIP_KEYCHAIN_SERVICE:-trip-planner-mcp}"

note()  { printf '\033[36m[bootstrap]\033[0m %s\n' "$*" >&2; }
ok()    { printf '\033[32m✓\033[0m %s\n' "$*" >&2; }
fail()  { printf '\033[31m✗\033[0m %s\n' "$*" >&2; }

require_bin() {
  command -v "$1" >/dev/null 2>&1 || {
    fail "$1 이 필요합니다. 설치 후 다시 실행해 주세요."
    exit 3
  }
}

note "런타임 진단"
require_bin node
require_bin python3
require_bin uv
ok "node $(node --version) · python3 $(python3 --version 2>&1 | awk '{print $2}') · uv $(uv --version | awk '{print $2}')"

note "trip-planner-mcp 패키지 설치"
uv tool install --upgrade trip-planner-mcp >&2 || {
  fail "패키지 설치 실패. 수동으로 'uv tool install trip-planner-mcp' 를 확인하세요."
  exit 1
}

note "OAuth listener 실행"
# 임시 디렉토리로 listener 다운로드 — install.sh 단일 실행 컨텍스트라 의존
# 파일 캐시는 불필요.
LISTENER_TMP="$(mktemp -t trip-oauth-listener.XXXXXX.mjs)"
trap 'rm -f "$LISTENER_TMP"' EXIT
curl -fsSL "$LISTENER_URL" -o "$LISTENER_TMP" || {
  fail "OAuth listener 다운로드 실패: $LISTENER_URL"
  exit 1
}

# listener 는 stdout 마지막 1줄에 JSON({"token":"..."}) 출력. stderr 는
# 사람용 진단. install.sh 는 stderr 만 사용자에게 보여주고 stdout 마지막
# 1줄만 캡처.
LISTENER_OUT="$(TRIP_BOOTSTRAP_BASE_URL="$BASE_URL" node "$LISTENER_TMP")" || {
  rc=$?
  case "$rc" in
    2) fail "인증 시간 초과(5분). 다시 실행해 주세요." ;;
    3) fail "state 검증 실패 — 부트스트랩 외부 요청이 끼어든 것 같습니다." ;;
    *) fail "OAuth listener 실패(코드 $rc)" ;;
  esac
  exit "$rc"
}
TOKEN="$(printf '%s' "$LISTENER_OUT" | tail -n 1 | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')"
if [ -z "$TOKEN" ] || [ "${TOKEN#tp_}" = "$TOKEN" ]; then
  fail "PAT 형식이 올바르지 않습니다."
  exit 2
fi
ok "PAT 수령 완료(평문 미노출)"

note "Keychain 에 PAT 저장 (service=$SERVICE_NAME)"
if [ "$(uname -s)" = "Darwin" ]; then
  security add-generic-password -s "$SERVICE_NAME" -a "$USER" -w "$TOKEN" -U >&2 || {
    fail "Keychain 저장 실패. 'security' 명령 권한을 확인하세요."
    exit 1
  }
  ok "Keychain 저장 완료"
else
  # Linux/Windows fallback — 파일 0600 모드. 후속 spec 030 patch 에서
  # secret-tool/Credential Manager 통합 예정.
  CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/trip-planner"
  mkdir -p "$CONFIG_DIR"
  printf '%s' "$TOKEN" > "$CONFIG_DIR/pat"
  chmod 600 "$CONFIG_DIR/pat"
  ok "토큰 파일 저장 ($CONFIG_DIR/pat, 0600)"
fi

note "MCP 클라이언트 등록(claude mcp add -s user)"
if command -v claude >/dev/null 2>&1; then
  # 사용자 스코프 등록. env 로 토큰 전달. -s user 는 ~/.claude/settings.json
  # 의 mcpServers 에 추가.
  claude mcp add -s user trip \
    --env "TRIP_API_TOKEN=$TOKEN" \
    --env "TRIP_API_BASE=$BASE_URL" \
    -- uvx trip-planner-mcp >&2 || {
    fail "claude mcp add 실패. 'claude' CLI 버전을 확인하세요."
    exit 4
  }
  ok "Claude 등록 완료"
else
  note "claude CLI 미감지 — Claude Code 외 클라이언트는 환경변수 TRIP_API_TOKEN 으로 직접 사용해 주세요."
fi

note "동작 검증 ping"
if TRIP_API_TOKEN="$TOKEN" TRIP_API_BASE="$BASE_URL" uvx trip-planner-mcp --verify >&2 2>&1; then
  ok "ping 성공 — trip-planner MCP 가 사용 준비됐습니다."
else
  fail "동작 검증 실패. claude /mcp 로 등록 상태를 점검해 주세요."
  exit 1
fi

note "완료. AI 클라이언트를 재시작하면 trip-planner 도구가 노출됩니다."
exit 0
