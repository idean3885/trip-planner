#!/usr/bin/env bash
set -euo pipefail

# travel-planner MCP server setup script
# Sets up the hotels_mcp_server virtual environment and .env file

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SERVER_DIR="${REPO_ROOT}/mcp-servers/hotels_mcp_server"
VENV_DIR="${SERVER_DIR}/.venv"
ENV_FILE="${SERVER_DIR}/.env"
REQUIREMENTS="${SERVER_DIR}/requirements.txt"

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
            echo -e "${GREEN}Found Python ${version} at $(command -v $candidate)${NC}"
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
    echo "Creating virtual environment at ${VENV_DIR} ..."
    "${PYTHON_BIN}" -m venv "${VENV_DIR}"
    echo -e "${GREEN}Virtual environment created.${NC}"
else
    echo ""
    echo "Virtual environment already exists at ${VENV_DIR}."
fi

# 3. Install dependencies
echo ""
echo "Installing dependencies from ${REQUIREMENTS} ..."
"${VENV_DIR}/bin/pip" install --quiet --upgrade pip
"${VENV_DIR}/bin/pip" install --quiet -r "${REQUIREMENTS}"
echo -e "${GREEN}Dependencies installed.${NC}"

# 4. Check / create .env
echo ""
if [ -f "${ENV_FILE}" ]; then
    echo -e "${GREEN}.env file already exists at ${ENV_FILE}.${NC}"
else
    echo -e "${YELLOW}.env file not found. A RAPIDAPI_KEY is required to call the Hotels API.${NC}"
    echo -n "Enter your RAPIDAPI_KEY (or press Enter to skip): "
    read -r RAPIDAPI_KEY_INPUT

    if [ -n "${RAPIDAPI_KEY_INPUT}" ]; then
        cat > "${ENV_FILE}" <<EOF
RAPIDAPI_KEY=${RAPIDAPI_KEY_INPUT}
EOF
        echo -e "${GREEN}.env file created at ${ENV_FILE}.${NC}"
    else
        echo -e "${YELLOW}Skipped. Create ${ENV_FILE} manually with:${NC}"
        echo "  echo 'RAPIDAPI_KEY=your_key_here' > ${ENV_FILE}"
    fi
fi

# 5. Print Claude Desktop config instructions
PYTHON_PATH="${VENV_DIR}/bin/python"

echo ""
echo "============================================================"
echo -e "${GREEN}Setup complete!${NC}"
echo "============================================================"
echo ""
echo "Add the following to your Claude Desktop config:"
echo "  ~/Library/Application Support/Claude/claude_desktop_config.json"
echo ""
cat <<EOF
{
  "mcpServers": {
    "travel": {
      "command": "${PYTHON_PATH}",
      "args": ["-m", "hotels_mcp.hotels_server"],
      "cwd": "${SERVER_DIR}",
      "env": {
        "RAPIDAPI_KEY": "your_key_here"
      }
    }
  }
}
EOF
echo ""
echo "An example config file is also available at:"
echo "  ${REPO_ROOT}/claude_desktop_config.example.json"
echo ""
echo "Restart Claude Desktop after updating the config."
