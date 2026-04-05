#!/usr/bin/env bash
set -euo pipefail

# trip-planner MCP server setup script
# 실행만 하면 venv + 의존성 + .env + Claude Desktop 설정까지 자동 완료

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SERVER_DIR="${REPO_ROOT}/mcp-servers/hotels_mcp_server"
VENV_DIR="${SERVER_DIR}/.venv"
ENV_FILE="${SERVER_DIR}/.env"
REQUIREMENTS="${SERVER_DIR}/requirements.txt"
CLAUDE_CONFIG_DIR="${HOME}/Library/Application Support/Claude"
CLAUDE_CONFIG_FILE="${CLAUDE_CONFIG_DIR}/claude_desktop_config.json"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=== Travel Planner MCP Server Setup ==="
echo ""

# 1. Check Python 3.10+
echo "Checking Python version..."
PYTHON_BIN=""
for candidate in python3 python; do
    if command -v "$candidate" &>/dev/null; then
        version=$("$candidate" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || true)
        major=$(echo "$version" | cut -d. -f1)
        minor=$(echo "$version" | cut -d. -f2)
        if [ "${major}" -ge 3 ] && [ "${minor}" -ge 10 ]; then
            PYTHON_BIN="$candidate"
            echo -e "${GREEN}Found Python ${version} at $(command -v "$candidate")${NC}"
            break
        fi
    fi
done

if [ -z "${PYTHON_BIN}" ]; then
    echo -e "${RED}Error: Python 3.10 or higher is required but was not found.${NC}"
    echo "Install Python 3.10+ via https://www.python.org/downloads/ or Homebrew:"
    echo "  brew install python@3.12"
    exit 1
fi

# 2. Create venv if not exists
if [ ! -d "${VENV_DIR}" ]; then
    echo ""
    echo "Creating virtual environment..."
    "${PYTHON_BIN}" -m venv "${VENV_DIR}"
    echo -e "${GREEN}Virtual environment created.${NC}"
else
    echo ""
    echo "Virtual environment already exists."
fi

# 3. Install dependencies
echo ""
echo "Installing dependencies..."
"${VENV_DIR}/bin/pip" install --quiet --upgrade pip
"${VENV_DIR}/bin/pip" install --quiet -r "${REQUIREMENTS}"
echo -e "${GREEN}Dependencies installed.${NC}"

# 4. Check / create .env with API key
echo ""
if [ -f "${ENV_FILE}" ]; then
    echo -e "${GREEN}.env file already exists.${NC}"
else
    echo -e "${YELLOW}RapidAPI key is required for hotel/flight/attraction search.${NC}"
    echo -e "Get your key at: https://rapidapi.com/DataCrawler/api/booking-com15"
    echo ""
    echo -n "Enter your RAPIDAPI_KEY: "
    read -r RAPIDAPI_KEY_INPUT

    if [ -z "${RAPIDAPI_KEY_INPUT}" ]; then
        echo -e "${RED}API key is required. Exiting.${NC}"
        exit 1
    fi

    cat > "${ENV_FILE}" <<EOF
RAPIDAPI_KEY=${RAPIDAPI_KEY_INPUT}
RAPIDAPI_HOST=booking-com15.p.rapidapi.com
EOF
    echo -e "${GREEN}.env file created.${NC}"
fi

# 5. Auto-configure Claude Desktop
PYTHON_PATH="${VENV_DIR}/bin/python"
RAPIDAPI_KEY_VALUE=$(grep '^RAPIDAPI_KEY=' "${ENV_FILE}" | cut -d= -f2-)

echo ""
echo "Configuring Claude Desktop..."

# Create Claude config directory if not exists
mkdir -p "${CLAUDE_CONFIG_DIR}"

TRAVEL_CONFIG=$(cat <<JSONEOF
{
    "command": "${PYTHON_PATH}",
    "args": ["-m", "hotels_mcp.hotels_server"],
    "cwd": "${SERVER_DIR}",
    "env": {
        "RAPIDAPI_KEY": "${RAPIDAPI_KEY_VALUE}",
        "RAPIDAPI_HOST": "booking-com15.p.rapidapi.com"
    }
}
JSONEOF
)

if [ -f "${CLAUDE_CONFIG_FILE}" ]; then
    # Config exists — check if travel server already configured
    if "${VENV_DIR}/bin/python" -c "
import json, sys
with open('${CLAUDE_CONFIG_FILE}', 'r') as f:
    config = json.load(f)
if 'mcpServers' in config and 'travel' in config['mcpServers']:
    sys.exit(0)
sys.exit(1)
" 2>/dev/null; then
        # travel already exists — update it
        "${VENV_DIR}/bin/python" -c "
import json
with open('${CLAUDE_CONFIG_FILE}', 'r') as f:
    config = json.load(f)
config['mcpServers']['travel'] = json.loads('''${TRAVEL_CONFIG}''')
with open('${CLAUDE_CONFIG_FILE}', 'w') as f:
    json.dump(config, f, indent=2, ensure_ascii=False)
print('Updated existing travel server config.')
"
    else
        # mcpServers exists but no travel — add it
        "${VENV_DIR}/bin/python" -c "
import json
with open('${CLAUDE_CONFIG_FILE}', 'r') as f:
    config = json.load(f)
if 'mcpServers' not in config:
    config['mcpServers'] = {}
config['mcpServers']['travel'] = json.loads('''${TRAVEL_CONFIG}''')
with open('${CLAUDE_CONFIG_FILE}', 'w') as f:
    json.dump(config, f, indent=2, ensure_ascii=False)
print('Added travel server to existing config.')
"
    fi
else
    # No config file — create new
    "${VENV_DIR}/bin/python" -c "
import json
config = {
    'mcpServers': {
        'travel': json.loads('''${TRAVEL_CONFIG}''')
    }
}
with open('${CLAUDE_CONFIG_FILE}', 'w') as f:
    json.dump(config, f, indent=2, ensure_ascii=False)
print('Created new Claude Desktop config.')
"
fi

echo -e "${GREEN}Claude Desktop configured.${NC}"

# 6. Done
echo ""
echo "============================================================"
echo -e "${GREEN}Setup complete!${NC}"
echo "============================================================"
echo ""
echo "Available MCP tools (8):"
echo "  Hotels   : search_destinations, get_hotels, get_hotel_details"
echo "  Flights  : search_flight_destinations, search_flights"
echo "  Attractions: search_attraction_locations, search_attractions, get_attraction_details"
echo ""
echo -e "${YELLOW}Restart Claude Desktop to activate the MCP server.${NC}"
echo ""
echo "Test in Claude Desktop:"
echo '  "바르셀로나 관광지 추천해줘"'
