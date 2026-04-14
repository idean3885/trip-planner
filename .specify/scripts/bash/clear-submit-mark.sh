#!/usr/bin/env bash
# clear-submit-mark.sh — PostToolUse hook for Bash(git commit)
# 커밋 성공 후 서브밋 마커를 삭제하여 다음 커밋 시 재검증을 강제한다.

set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# git commit 명령인지 정밀 매칭
IS_COMMIT=false
if [[ "$COMMAND" =~ ^[[:space:]]*git[[:space:]]+commit ]]; then
  IS_COMMIT=true
elif [[ "$COMMAND" =~ (\&\&|;)[[:space:]]*git[[:space:]]+commit ]]; then
  IS_COMMIT=true
fi

if [[ "$IS_COMMIT" == "false" ]]; then
  exit 0
fi

# 커밋 성공 여부 확인 (PostToolUse이므로 결과가 있음)
# exit code가 0이 아닌 경우 마커 유지 (재시도 가능)
TOOL_RESPONSE=$(echo "$INPUT" | jq -r '.tool_response // empty')
if echo "$TOOL_RESPONSE" | grep -qi "error\|fatal\|abort"; then
  exit 0  # 커밋 실패 — 마커 유지
fi

# 마커 삭제
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
MARKER="$REPO_ROOT/.specify/state/submit-ready.json"

if [[ -f "$MARKER" ]]; then
  rm -f "$MARKER"
fi

exit 0
