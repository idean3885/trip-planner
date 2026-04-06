#!/usr/bin/env bash
set -euo pipefail

# trip-planner MCP server 원클릭 설치 스크립트
# curl 파이프 실행 지원: curl -sSL https://raw.githubusercontent.com/idean3885/trip-planner/main/scripts/install.sh | bash

REPO_URL="https://github.com/idean3885/trip-planner.git"
INSTALL_DIR="${HOME}/.trip-planner"
VENV_DIR="${INSTALL_DIR}/.venv"
ENV_FILE="${INSTALL_DIR}/.env"
SRC_DIR="${INSTALL_DIR}/src"
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
echo -e "${CYAN}  Travel Planner MCP Server 설치${NC}"
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
    # 업데이트 후 패키지 재설치 (새 의존성 반영)
    NEEDS_REINSTALL=true
    echo -e "  ${GREEN}업데이트 완료${NC}"
else
    if [ -d "${INSTALL_DIR}" ]; then
        # git 없이 디렉토리만 있는 경우 제거 후 클론
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
# editable 모드로 설치 — git pull 시 소스 변경이 즉시 반영됨
"${VENV_DIR}/bin/pip" install --quiet -e "${INSTALL_DIR}"
echo -e "  ${GREEN}패키지 설치 완료${NC}"

# ── 5. RapidAPI 키 입력 ───────────────────────────────────────────
KEYCHAIN_SERVICE="trip-planner"
KEYCHAIN_ACCOUNT="rapidapi-key"
USE_KEYCHAIN=false
RAPIDAPI_KEY_VALUE=""

echo ""

# 기존 저장소 확인: 키체인 → .env
if command -v security &>/dev/null; then
    RAPIDAPI_KEY_VALUE=$(security find-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_ACCOUNT}" -w 2>/dev/null || true)
    if [ -n "${RAPIDAPI_KEY_VALUE}" ]; then
        USE_KEYCHAIN=true
        echo -e "  ${GREEN}macOS 키체인에서 API 키를 찾았습니다.${NC}"
    fi
fi

if [ -z "${RAPIDAPI_KEY_VALUE}" ] && [ -f "${ENV_FILE}" ] && grep -q "^RAPIDAPI_KEY=.\+" "${ENV_FILE}" 2>/dev/null; then
    RAPIDAPI_KEY_VALUE=$(grep '^RAPIDAPI_KEY=' "${ENV_FILE}" | cut -d= -f2-)
    echo -e "  ${GREEN}.env 파일에서 API 키를 찾았습니다.${NC}"
fi

# 키가 없으면 입력받기
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

    # curl 파이프 실행 시 stdin이 터미널이 아니므로 /dev/tty 사용
    if [ -t 0 ]; then
        INPUT_DEV="/dev/stdin"
    else
        INPUT_DEV="/dev/tty"
    fi

    while true; do
        printf "  RapidAPI 키를 입력하세요: "
        read -r RAPIDAPI_KEY_VALUE < "${INPUT_DEV}"
        if [ -n "${RAPIDAPI_KEY_VALUE}" ]; then
            break
        fi
        echo -e "  ${RED}키를 입력해야 합니다. 다시 시도해 주세요.${NC}"
    done
fi

# 저장: 키체인 우선, 실패 시 .env 폴백
if command -v security &>/dev/null; then
    # 기존 항목 삭제 후 새로 추가 (업데이트 지원)
    security delete-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_ACCOUNT}" &>/dev/null || true
    if security add-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_ACCOUNT}" -w "${RAPIDAPI_KEY_VALUE}" &>/dev/null; then
        USE_KEYCHAIN=true
        echo -e "  ${GREEN}macOS 키체인에 API 키 저장 완료${NC}"
        # 키체인 사용 시 .env 파일 제거 (보안)
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
    echo -e "  ${GREEN}.env 파일에 API 키 저장 완료${NC}"
fi

# ── 6. che-ical-mcp (Apple 캘린더) 설치 ──────────────────────────
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
        # GitHub API로 최신 릴리즈의 CheICalMCP 바이너리 URL 가져오기
        ICAL_URL=$(curl -sL "https://api.github.com/repos/${ICAL_REPO}/releases/latest" \
            | grep -o '"browser_download_url": *"[^"]*CheICalMCP"' \
            | head -1 \
            | sed 's/.*"browser_download_url": *"//;s/"$//')

        if [ -n "${ICAL_URL}" ]; then
            if curl -sL -o "${ICAL_BIN}" "${ICAL_URL}"; then
                chmod +x "${ICAL_BIN}"
                # macOS Gatekeeper 허용
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

# ── 7. Claude Desktop 자동 설정 ──────────────────────────────────
echo ""
echo "▶ Claude Desktop 설정 중..."

mkdir -p "${CLAUDE_CONFIG_DIR}"

PYTHON_PATH="${VENV_DIR}/bin/python"

# Python으로 JSON을 안전하게 읽고 쓰기 (sed/jq 미사용)
"${PYTHON_PATH}" - <<PYEOF
import json, os, sys

config_file   = "${CLAUDE_CONFIG_FILE}"
python_path   = "${PYTHON_PATH}"
install_dir   = "${INSTALL_DIR}"
src_dir       = "${SRC_DIR}"
api_key       = "${RAPIDAPI_KEY_VALUE}"
use_keychain  = "${USE_KEYCHAIN}"

travel_entry = {
    "command": python_path,
    "args": ["-m", "travel_mcp.server"],
    "cwd": install_dir,
}

# 키체인 미사용 시에만 env 블록에 API 키 포함
if use_keychain == "false":
    travel_entry["env"] = {
        "RAPIDAPI_KEY": api_key,
        "RAPIDAPI_HOST": "booking-com15.p.rapidapi.com",
    }
else:
    travel_entry["env"] = {
        "RAPIDAPI_HOST": "booking-com15.p.rapidapi.com",
    }

# 기존 설정 파일 읽기 (없으면 빈 구조 생성)
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

action = "업데이트" if "travel" in config["mcpServers"] else "추가"
config["mcpServers"]["travel"] = travel_entry

# che-ical-mcp (Apple 캘린더) 설정 — 기존 항목이 없을 때만 추가
ical_installed = "${ICAL_INSTALLED}"
ical_bin = "${ICAL_BIN}"
if ical_installed == "true" and "che-ical-mcp" not in config["mcpServers"]:
    config["mcpServers"]["che-ical-mcp"] = {
        "command": ical_bin,
        "args": [],
    }
    print("  che-ical-mcp 서버 설정 추가 완료")
elif ical_installed == "true":
    print("  che-ical-mcp 서버 설정이 이미 존재합니다. 유지합니다.")

with open(config_file, "w", encoding="utf-8") as f:
    json.dump(config, f, indent=2, ensure_ascii=False)

print(f"  travel 서버 설정 {action} 완료")
PYEOF

echo -e "  ${GREEN}Claude Desktop 설정 완료${NC}"

# ── 8. 완료 메시지 ────────────────────────────────────────────────
echo ""
echo "============================================================"
echo -e "${GREEN}  설치 완료!${NC}"
echo "============================================================"
echo ""
echo -e "  ${YELLOW}Claude Desktop을 재시작하세요${NC}"
echo ""
echo "  테스트 방법:"
echo -e "  ${CYAN}Claude Desktop에서 아래 메시지를 입력해 보세요:${NC}"
echo ""
echo '    "바르셀로나 6월 16일~20일 4박 숙소 추천해줘"'
echo ""
if [ "${ICAL_INSTALLED}" = true ]; then
    echo -e "  ${GREEN}✓ 캘린더 연동${NC}: Apple 캘린더 MCP 설치됨"
    echo '    "여행 일정 캘린더에 넣어줘" 로 캘린더 등록 가능'
else
    echo -e "  ${YELLOW}△ 캘린더 연동${NC}: 미설치 (macOS 전용)"
fi
echo ""
echo "  설치 위치: ${INSTALL_DIR}"
echo "  설정 파일: ${CLAUDE_CONFIG_FILE}"
echo ""
