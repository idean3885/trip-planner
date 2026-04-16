#!/usr/bin/env bash
# enforce-speckit.sh — PreToolUse hook for Edit|Write
# 소스 파일 편집 시 speckit 산출물(spec.md, plan.md, tasks.md) 존재를 강제한다.
#
# 차단 조건:
#   1. main 브랜치에서 소스 파일 편집 시도 → devex:flow 안내
#   2. 피처 브랜치에서 speckit 산출물 미완성 시 → 누락된 단계 안내
#
# 허용 조건:
#   - 소스 파일이 아닌 경우 (config, spec, markdown 등)
#   - 피처 브랜치에서 spec.md + plan.md + tasks.md 모두 존재

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# file_path 없으면 패스 (Write 등에서 다른 필드명 사용 가능)
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# 1) 소스 파일 여부 판단 — 코드 확장자만 대상
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.py|*.css|*.scss|*.prisma)
    # 소스 파일 — 이후 검증 진행
    ;;
  *)
    exit 0  # 소스 파일 아님 → 허용
    ;;
esac

# 2) speckit/config 경로는 제외
case "$FILE_PATH" in
  */.specify/*|*/specs/*|*/.claude/*|*/.omc/*|*/node_modules/*|*/.next/*)
    exit 0
    ;;
esac

# 3) 프로젝트 루트 확인
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
if [[ -z "$REPO_ROOT" ]]; then
  exit 0  # git 레포 아님 → 패스
fi

# 프로젝트 외부 파일이면 패스
case "$FILE_PATH" in
  "$REPO_ROOT"/*)
    ;;
  *)
    exit 0
    ;;
esac

# 4) 브랜치 확인
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

# main/master/develop에서 소스 편집 차단
if [[ "$BRANCH" == "main" || "$BRANCH" == "master" || "$BRANCH" == "develop" ]]; then
  echo "BLOCKED: ${BRANCH} 브랜치에서 소스 파일 편집은 허용되지 않습니다." >&2
  echo "→ 피처 브랜치를 생성한 후 작업하세요." >&2
  exit 2
fi

# 5) 피처 브랜치 패턴 확인 (NNN-*)
if [[ ! "$BRANCH" =~ ^[0-9]{3}- ]]; then
  exit 0  # 피처 브랜치 규칙 밖 → 패스 (임시 브랜치 등)
fi

# 6) speckit 산출물 확인
PREFIX="${BRANCH:0:3}"
FEATURE_DIR=$(find "$REPO_ROOT/specs" -maxdepth 1 -name "${PREFIX}-*" -type d 2>/dev/null | head -1)

if [[ -z "$FEATURE_DIR" ]]; then
  echo "BLOCKED: specs/ 디렉토리에 피처 ${BRANCH}의 스펙이 없습니다." >&2
  echo "→ /speckit.specify 를 실행하여 스펙을 생성하세요." >&2
  exit 2
fi

MISSING=()
[[ ! -f "$FEATURE_DIR/spec.md" ]]  && MISSING+=("spec.md  → /speckit.specify")
[[ ! -f "$FEATURE_DIR/plan.md" ]]  && MISSING+=("plan.md  → /speckit.plan")
[[ ! -f "$FEATURE_DIR/tasks.md" ]] && MISSING+=("tasks.md → /speckit.tasks")

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "BLOCKED: speckit 산출물이 완성되지 않았습니다. (${BRANCH})" >&2
  for m in "${MISSING[@]}"; do
    echo "  ✗ $m" >&2
  done
  echo "→ 위 단계를 완료한 후 구현을 시작하세요." >&2
  exit 2
fi

# 7) spec.md 기술 중립성 검증
SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LINT_RESULT=$("$SCRIPT_DIR/lint-spec-neutrality.sh" "$FEATURE_DIR/spec.md" 2>&1) || {
  echo "BLOCKED: spec.md에 기술 구체명이 포함되어 있습니다." >&2
  echo "$LINT_RESULT" >&2
  echo "" >&2
  echo "→ spec.md에서 기술명을 중립 표현으로 교체한 후 구현을 시작하세요." >&2
  exit 2
}

# 모든 조건 충족 → 허용
exit 0
