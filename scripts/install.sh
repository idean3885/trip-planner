#!/usr/bin/env bash
set -euo pipefail

# trip-planner MCP server v2 원클릭 설치 스크립트
# curl 파이프 실행 지원: curl -sSL https://raw.githubusercontent.com/idean3885/trip-planner/main/scripts/install.sh | bash

REPO_URL="https://github.com/idean3885/trip-planner.git"
INSTALL_DIR="${HOME}/.trip-planner"
VENV_DIR="${INSTALL_DIR}/.venv"
ENV_FILE="${INSTALL_DIR}/.env"
CLAUDE_CONFIG_DIR="${HOME}/Library/Application Support/Claude"
CLAUDE_CONFIG_FILE="${CLAUDE_CONFIG_DIR}/claude_desktop_config.json"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo "============================================================"
echo -e "${CYAN}  Trip Planner MCP Server v2 설치${NC}"
echo "============================================================"
echo ""

# ── 1. Python 3.10+ 확인 ─────────────────────────────────────────
echo "▶ Python 버전 확인 중..."
PYTHON_BIN=""
for candidate in python3.14 python3.13 python3.12 python3.11 python3.10 python3 python; do
    if command -v "$candidate" &>/dev/null; then
        version=$("$candidate" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || true)
        major=$(echo "$version" | cut -d. -f1)
        minor=$(echo "$version" | cut -d. -f2)
        if [ "${major:-0}" -ge 3 ] && [ "${minor:-0}" -ge 10 ]; then
            PYTHON_BIN="$candidate"
            echo -e "  ${GREEN}Python ${version} 발견 ($(command -v "$candidate"))${NC}"
            break
        fi
    fi
done

if [ -z "${PYTHON_BIN}" ]; then
    echo -e "${RED}오류: Python 3.10 이상이 필요합니다.${NC}"
    echo ""
    echo "Python 설치 방법:"
    echo "  1) 공식 사이트: https://www.python.org/downloads/"
    echo "  2) Homebrew:    brew install python@3.12"
    echo ""
    exit 1
fi

# ── 2. 저장소 복제 또는 업데이트 ──────────────────────────────────
echo ""
echo "▶ 저장소 설치 중..."
if [ -d "${INSTALL_DIR}/.git" ]; then
    echo "  이미 설치되어 있습니다. 최신 버전으로 업데이트 중..."
    git -C "${INSTALL_DIR}" pull --ff-only 2>&1 | sed 's/^/  /'
    echo -e "  ${GREEN}업데이트 완료${NC}"
else
    if [ -d "${INSTALL_DIR}" ]; then
        rm -rf "${INSTALL_DIR}"
    fi
    git clone "${REPO_URL}" "${INSTALL_DIR}" 2>&1 | sed 's/^/  /'
    echo -e "  ${GREEN}다운로드 완료: ${INSTALL_DIR}${NC}"
fi

# ── 3. 가상환경 생성 ──────────────────────────────────────────────
echo ""
echo "▶ 가상환경 설정 중..."
if [ ! -d "${VENV_DIR}" ]; then
    "${PYTHON_BIN}" -m venv "${VENV_DIR}"
    echo -e "  ${GREEN}가상환경 생성 완료${NC}"
else
    echo "  가상환경이 이미 존재합니다."
fi

# ── 4. 의존성 설치 ────────────────────────────────────────────────
echo ""
echo "▶ 필요한 패키지 설치 중... (잠시 기다려 주세요)"
"${VENV_DIR}/bin/pip" install --quiet --upgrade pip
"${VENV_DIR}/bin/pip" install --quiet -e "${INSTALL_DIR}"
echo -e "  ${GREEN}패키지 설치 완료${NC}"

# ── 5. RapidAPI 키 입력 ───────────────────────────────────────────
KEYCHAIN_SERVICE="trip-planner"
KEYCHAIN_RAPIDAPI="rapidapi-key"
USE_KEYCHAIN=false
RAPIDAPI_KEY_VALUE=""

echo ""

# 기존 저장소 확인: 키체인 → .env
if command -v security &>/dev/null; then
    RAPIDAPI_KEY_VALUE=$(security find-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_RAPIDAPI}" -w 2>/dev/null || true)
    if [ -n "${RAPIDAPI_KEY_VALUE}" ]; then
        USE_KEYCHAIN=true
        echo -e "  ${GREEN}macOS 키체인에서 RapidAPI 키를 찾았습니다.${NC}"
    fi
fi

if [ -z "${RAPIDAPI_KEY_VALUE}" ] && [ -f "${ENV_FILE}" ] && grep -q "^RAPIDAPI_KEY=.\+" "${ENV_FILE}" 2>/dev/null; then
    RAPIDAPI_KEY_VALUE=$(grep '^RAPIDAPI_KEY=' "${ENV_FILE}" | cut -d= -f2-)
    echo -e "  ${GREEN}.env 파일에서 RapidAPI 키를 찾았습니다.${NC}"
fi

if [ -z "${RAPIDAPI_KEY_VALUE}" ]; then
    echo -e "${YELLOW}▶ RapidAPI 키 설정${NC}"
    echo ""
    echo "  호텔/항공/관광지 검색을 위해 RapidAPI 키가 필요합니다."
    echo ""
    echo -e "  ${CYAN}키 발급 방법:${NC}"
    echo "    1) https://rapidapi.com/DataCrawler/api/booking-com15 접속"
    echo "    2) 우측 상단 'Subscribe to Test' 클릭 (무료 플랜 선택)"
    echo "    3) 'X-RapidAPI-Key' 값을 복사"
    echo ""

    if [ -t 0 ]; then INPUT_DEV="/dev/stdin"; else INPUT_DEV="/dev/tty"; fi

    while true; do
        printf "  RapidAPI 키를 입력하세요: "
        read -r RAPIDAPI_KEY_VALUE < "${INPUT_DEV}"
        if [ -n "${RAPIDAPI_KEY_VALUE}" ]; then break; fi
        echo -e "  ${RED}키를 입력해야 합니다. 다시 시도해 주세요.${NC}"
    done
fi

# 저장: 키체인 우선
if command -v security &>/dev/null; then
    security delete-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_RAPIDAPI}" &>/dev/null || true
    if security add-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_RAPIDAPI}" -w "${RAPIDAPI_KEY_VALUE}" &>/dev/null; then
        USE_KEYCHAIN=true
        echo -e "  ${GREEN}macOS 키체인에 RapidAPI 키 저장 완료${NC}"
        rm -f "${ENV_FILE}"
    else
        echo -e "  ${YELLOW}키체인 저장 실패. .env 파일로 저장합니다.${NC}"
    fi
fi

if [ "${USE_KEYCHAIN}" = false ]; then
    cat > "${ENV_FILE}" <<EOF
RAPIDAPI_KEY=${RAPIDAPI_KEY_VALUE}
RAPIDAPI_HOST=booking-com15.p.rapidapi.com
EOF
    echo -e "  ${GREEN}.env 파일에 RapidAPI 키 저장 완료${NC}"
fi

# ── 6. Trip Planner PAT 설정 (일정 관리용) ───────────────────────
KEYCHAIN_PAT="api-pat"
PAT_VALUE=""
PAT_INSTALLED=false

echo ""

# 키체인에서 기존 PAT 확인
if command -v security &>/dev/null; then
    PAT_VALUE=$(security find-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_PAT}" -w 2>/dev/null || true)
fi

if [ -n "${PAT_VALUE}" ]; then
    echo -e "  ${GREEN}macOS 키체인에서 Trip Planner 토큰을 찾았습니다.${NC}"
    PAT_INSTALLED=true
else
    echo -e "${YELLOW}▶ Trip Planner API 토큰 설정 (선택사항)${NC}"
    echo ""
    echo "  AI 에이전트로 여행 일정을 직접 수정하려면 API 토큰이 필요합니다."
    echo ""

    # ── 6a. 브라우저 OAuth 인증 시도 ──
    BROWSER_AUTH_OK=false
    if [ -t 0 ] || [ -t 1 ]; then
        STATE=$(openssl rand -hex 16 2>/dev/null || true)
        if [ -n "${STATE}" ]; then
            echo -e "  ${CYAN}브라우저에서 Google 로그인으로 자동 인증합니다...${NC}"
            echo "  브라우저가 열립니다. Google 로그인을 완료해 주세요."
            echo -e "  ${YELLOW}(최대 120초 대기)${NC}"
            echo ""

            # Python이 서버 기동 + 브라우저 열기 + 콜백 수신을 모두 처리
            BROWSER_TOKEN=$("${PYTHON_BIN}" -c "
import http.server, urllib.parse, sys, socketserver, webbrowser

state = sys.argv[1]
base_url = sys.argv[2]

class H(http.server.BaseHTTPRequestHandler):
    token = None
    def do_GET(self):
        p = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(p.query)
        if p.path == '/callback':
            if q.get('state', [''])[0] != state:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'State mismatch')
                return
            H.token = q.get('token', [''])[0]
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            html = '<html><body style=\"font-family:system-ui;text-align:center;padding:60px\">'
            html += '<h1>인증 완료!</h1><p>이 창을 닫고 터미널로 돌아가세요.</p></body></html>'
            self.wfile.write(html.encode())
        else:
            self.send_response(404)
            self.end_headers()
    def log_message(self, *a): pass

with socketserver.TCPServer(('127.0.0.1', 0), H) as s:
    port = s.server_address[1]
    url = f'{base_url}/api/auth/cli?port={port}&state={state}'
    webbrowser.open(url)
    s.timeout = 120
    s.handle_request()
    if H.token:
        print(H.token, end='')
" "${STATE}" "https://trip.idean.me" 2>/dev/null || true)

            if [ -n "${BROWSER_TOKEN}" ]; then
                PAT_VALUE="${BROWSER_TOKEN}"
                security delete-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_PAT}" &>/dev/null || true
                if security add-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_PAT}" -w "${PAT_VALUE}" &>/dev/null; then
                    echo -e "  ${GREEN}브라우저 인증 성공! 토큰이 키체인에 저장되었습니다.${NC}"
                    PAT_INSTALLED=true
                    BROWSER_AUTH_OK=true
                fi
            fi
        fi
    fi

    # ── 6b. 브라우저 인증 실패 시 수동 입력 폴백 ──
    if [ "${BROWSER_AUTH_OK}" = false ]; then
        if [ "${CALLBACK_PORT:-}" != "" ]; then
            echo -e "  ${YELLOW}브라우저 인증이 완료되지 않았습니다.${NC}"
            echo ""
        fi
        echo "  건너뛰려면 Enter를 누르세요. (검색 기능만 사용 가능)"
        echo ""
        echo -e "  ${CYAN}수동 토큰 생성 방법:${NC}"
        echo "    1) https://trip.idean.me/settings 접속"
        echo "    2) Google 계정으로 로그인"
        echo "    3) '토큰 생성' 클릭 후 토큰 복사"
        echo ""

        if [ -t 0 ]; then INPUT_DEV="/dev/stdin"; else INPUT_DEV="/dev/tty"; fi

        printf "  Trip Planner 토큰을 입력하세요 (Enter로 건너뛰기): "
        read -r PAT_VALUE < "${INPUT_DEV}"

        if [ -n "${PAT_VALUE}" ]; then
            security delete-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_PAT}" &>/dev/null || true
            if security add-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_PAT}" -w "${PAT_VALUE}" &>/dev/null; then
                echo -e "  ${GREEN}macOS 키체인에 토큰 저장 완료${NC}"
                PAT_INSTALLED=true
            else
                echo -e "  ${YELLOW}키체인 저장 실패. 일정 관리 기능 없이 계속합니다.${NC}"
            fi
        else
            echo "  토큰을 건너뛰었습니다. (검색만 사용 가능)"
        fi
    fi
fi

# ── 7. che-ical-mcp (Apple 캘린더) 설치 ──────────────────────────
ICAL_INSTALLED=false
ICAL_BIN="${INSTALL_DIR}/bin/CheICalMCP"
ICAL_REPO="kiki830621/che-ical-mcp"

if [ "$(uname -s)" = "Darwin" ]; then
    echo ""
    echo "▶ Apple 캘린더 MCP 설치 중..."

    if [ -x "${ICAL_BIN}" ]; then
        echo "  CheICalMCP가 이미 설치되어 있습니다."
        ICAL_INSTALLED=true
    else
        mkdir -p "${INSTALL_DIR}/bin"
        ICAL_URL=$(curl -sL "https://api.github.com/repos/${ICAL_REPO}/releases/latest" \
            | grep -o '"browser_download_url": *"[^"]*CheICalMCP"' \
            | head -1 \
            | sed 's/.*"browser_download_url": *"//;s/"$//')

        if [ -n "${ICAL_URL}" ]; then
            if curl -sL -o "${ICAL_BIN}" "${ICAL_URL}"; then
                chmod +x "${ICAL_BIN}"
                xattr -d com.apple.quarantine "${ICAL_BIN}" 2>/dev/null || true
                echo -e "  ${GREEN}CheICalMCP 설치 완료${NC}"
                ICAL_INSTALLED=true
            else
                echo -e "  ${YELLOW}CheICalMCP 다운로드 실패. 캘린더 기능 없이 계속합니다.${NC}"
            fi
        else
            echo -e "  ${YELLOW}CheICalMCP 릴리즈를 찾을 수 없습니다. 캘린더 기능 없이 계속합니다.${NC}"
        fi
    fi
else
    echo ""
    echo -e "  ${YELLOW}macOS가 아닌 환경입니다. Apple 캘린더 MCP는 macOS 전용이므로 건너뜁니다.${NC}"
fi

# ── 8. v1 → v2 마이그레이션 ──────────────────────────────────────
# v1에서 설치한 feedback 서버, github-pat 키체인 정리
if command -v security &>/dev/null; then
    OLD_PAT=$(security find-generic-password -s "${KEYCHAIN_SERVICE}" -a "github-pat" -w 2>/dev/null || true)
    if [ -n "${OLD_PAT}" ]; then
        echo ""
        echo -e "  ${YELLOW}v1 → v2 마이그레이션: GitHub PAT 키체인 항목 정리${NC}"
        security delete-generic-password -s "${KEYCHAIN_SERVICE}" -a "github-pat" &>/dev/null || true
        echo -e "  ${GREEN}정리 완료${NC}"
    fi
fi

# ── 9. Claude Desktop 자동 설정 ──────────────────────────────────
echo ""
echo "▶ Claude Desktop 설정 중..."

mkdir -p "${CLAUDE_CONFIG_DIR}"

PYTHON_PATH="${VENV_DIR}/bin/python"

"${PYTHON_PATH}" - <<PYEOF
import json, os, sys

config_file   = "${CLAUDE_CONFIG_FILE}"
python_path   = "${PYTHON_PATH}"
install_dir   = "${INSTALL_DIR}"
use_keychain  = "${USE_KEYCHAIN}"
api_key       = "${RAPIDAPI_KEY_VALUE}"
pat_installed = "${PAT_INSTALLED}"

# trip 서버 설정 (v2: trip_mcp.server)
trip_entry = {
    "command": python_path,
    "args": ["-m", "trip_mcp.server"],
    "cwd": install_dir,
}

env_block = {"RAPIDAPI_HOST": "booking-com15.p.rapidapi.com"}
if use_keychain == "false":
    env_block["RAPIDAPI_KEY"] = api_key
trip_entry["env"] = env_block

# 기존 설정 읽기
if os.path.exists(config_file):
    try:
        with open(config_file, "r", encoding="utf-8") as f:
            config = json.load(f)
    except (json.JSONDecodeError, IOError):
        print("  경고: 기존 설정 파일을 읽을 수 없어 새로 생성합니다.")
        config = {}
else:
    config = {}

if "mcpServers" not in config:
    config["mcpServers"] = {}

# v1 → v2 마이그레이션: 이전 서버명 제거
for old_name in ["travel", "feedback"]:
    if old_name in config["mcpServers"]:
        del config["mcpServers"][old_name]
        print(f"  v1 서버 '{old_name}' 설정 제거")

# trip 서버 등록
action = "업데이트" if "trip" in config["mcpServers"] else "추가"
config["mcpServers"]["trip"] = trip_entry
print(f"  trip 서버 설정 {action} 완료")

# che-ical-mcp
ical_installed = "${ICAL_INSTALLED}"
ical_bin = "${ICAL_BIN}"
if ical_installed == "true" and "che-ical-mcp" not in config["mcpServers"]:
    config["mcpServers"]["che-ical-mcp"] = {"command": ical_bin, "args": []}
    print("  che-ical-mcp 서버 설정 추가 완료")

with open(config_file, "w", encoding="utf-8") as f:
    json.dump(config, f, indent=2, ensure_ascii=False)
PYEOF

echo -e "  ${GREEN}Claude Desktop 설정 완료${NC}"

# ── 10. 완료 메시지 ──────────────────────────────────────────────
echo ""
echo "============================================================"
echo -e "${GREEN}  설치 완료! (v2.0.0)${NC}"
echo "============================================================"
echo ""
echo -e "  ${YELLOW}Claude Desktop을 재시작하세요${NC}"
echo ""
echo "  테스트 방법:"
echo -e "  ${CYAN}Claude Desktop에서 아래 메시지를 입력해 보세요:${NC}"
echo ""
echo '    "바르셀로나 6월 16일~20일 4박 숙소 추천해줘"'
echo ""
if [ "${PAT_INSTALLED}" = true ]; then
    echo -e "  ${GREEN}✓ 일정 관리${NC}: API 토큰 설정됨"
    echo '    "내 여행 목록 보여줘" 로 일정 조회/수정 가능'
else
    echo -e "  ${YELLOW}△ 일정 관리${NC}: 미설정 (trip.idean.me에서 토큰 생성 필요)"
    echo "    install.sh를 다시 실행하면 설정할 수 있습니다."
fi
echo ""
if [ "${ICAL_INSTALLED}" = true ]; then
    echo -e "  ${GREEN}✓ 캘린더 연동${NC}: Apple 캘린더 MCP 설치됨"
else
    echo -e "  ${YELLOW}△ 캘린더 연동${NC}: 미설치 (macOS 전용)"
fi
echo ""
echo "  설치 위치: ${INSTALL_DIR}"
echo "  설정 파일: ${CLAUDE_CONFIG_FILE}"
echo "  API 문서:  https://trip.idean.me/docs"
echo ""
