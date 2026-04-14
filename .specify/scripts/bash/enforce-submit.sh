#!/usr/bin/env bash
# enforce-submit.sh — PreToolUse hook for Bash
# git commit 실행 전 검증 마커(submit-ready.json) 존재를 강제한다.
#
# 차단 조건:
#   1. git commit 명령인데 검증 마커가 없거나 브랜치가 불일치
#
# 허용 조건:
#   - git commit이 아닌 다른 Bash 명령
#   - main 브랜치 (speckit 외 작업 — 설정 파일 등)
#   - 검증 마커가 존재하고 현재 브랜치와 일치

set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# git commit 명령인지 정밀 매칭 (문자열 내 포함 방지)
# 시작이 "git commit" 이거나 "&& git commit" / "; git commit" 패턴만 매칭
IS_COMMIT=false
if [[ "$COMMAND" =~ ^[[:space:]]*git[[:space:]]+commit ]]; then
  IS_COMMIT=true
elif [[ "$COMMAND" =~ (\&\&|;)[[:space:]]*git[[:space:]]+commit ]]; then
  IS_COMMIT=true
fi

if [[ "$IS_COMMIT" == "false" ]]; then
  exit 0
fi

# git merge commit, amend 등은 검증 스킵 (수동 확인 필요)
if [[ "$COMMAND" == *"--amend"* || "$COMMAND" == *"merge"* ]]; then
  exit 0
fi

# 브랜치 확인
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

# main에서의 커밋은 speckit-gate가 소스 편집을 이미 차단하므로,
# 여기서는 config/spec 파일 커밋을 허용
if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
  exit 0
fi

# 피처 브랜치가 아니면 패스
if [[ ! "$BRANCH" =~ ^[0-9]{3}- ]]; then
  exit 0
fi

# 스테이징된 파일 중 소스 파일이 있는지 확인
# 소스 파일이 없으면 (스펙/설정만 커밋) 검증 없이 허용
HAS_SOURCE=false
while IFS= read -r staged_file; do
  case "$staged_file" in
    *.ts|*.tsx|*.js|*.jsx|*.py|*.css|*.scss|*.prisma)
      # speckit/config 경로 제외
      case "$staged_file" in
        .specify/*|specs/*|.claude/*|.omc/*) ;;
        *) HAS_SOURCE=true; break ;;
      esac
      ;;
  esac
done < <(git diff --cached --name-only 2>/dev/null)

if [[ "$HAS_SOURCE" == "false" ]]; then
  exit 0  # 소스 파일 없음 → 스펙/설정 커밋 허용
fi

# 검증 마커 확인
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
MARKER="$REPO_ROOT/.specify/state/submit-ready.json"

if [[ ! -f "$MARKER" ]]; then
  echo "BLOCKED: 서브밋 전 검증이 완료되지 않았습니다." >&2
  echo "" >&2
  echo "서브밋 전 필수 게이트:" >&2
  echo "  1. /speckit.analyze  — 스펙 일관성 검증" >&2
  echo "  2. /cross-verify:cross-verify  — 교차 검증" >&2
  echo "  3. bash .specify/scripts/bash/mark-submit-ready.sh  — 검증 마커 생성" >&2
  echo "" >&2
  echo "→ 위 단계를 순서대로 실행한 후 다시 커밋하세요." >&2
  exit 2
fi

# 마커의 브랜치가 현재 브랜치와 일치하는지 확인
MARKER_BRANCH=$(jq -r '.branch // empty' "$MARKER" 2>/dev/null)
if [[ "$MARKER_BRANCH" != "$BRANCH" ]]; then
  echo "BLOCKED: 검증 마커가 다른 브랜치($MARKER_BRANCH)의 것입니다." >&2
  echo "→ 현재 브랜치($BRANCH)에서 검증을 다시 실행하세요." >&2
  exit 2
fi

# 검증 마커 유효 → 허용
exit 0
