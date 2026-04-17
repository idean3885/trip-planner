#!/usr/bin/env bash
# mark-submit-ready.sh — 검증 완료 후 서브밋 마커를 생성한다.
#
# 사용법:
#   bash .specify/scripts/bash/mark-submit-ready.sh [check1] [check2] ...
#
# 예시:
#   bash .specify/scripts/bash/mark-submit-ready.sh speckit-analyze cross-verify
#
# 마커 파일: .specify/state/submit-ready.json

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
STATE_DIR="$REPO_ROOT/.specify/state"
MARKER="$STATE_DIR/submit-ready.json"

# 피처 브랜치 확인
if [[ ! "$BRANCH" =~ ^[0-9]{3}- ]]; then
  echo "ERROR: 피처 브랜치(NNN-*)에서만 실행 가능합니다. 현재: $BRANCH" >&2
  exit 1
fi

# speckit 산출물 존재 확인 (마커 생성 전 최종 확인)
PREFIX="${BRANCH:0:3}"
FEATURE_DIR=$(find "$REPO_ROOT/specs" -mindepth 1 -maxdepth 2 -type d -name "${PREFIX}-*" 2>/dev/null | head -1)

if [[ -z "$FEATURE_DIR" ]]; then
  echo "ERROR: specs/ 디렉토리에 피처 스펙이 없습니다." >&2
  exit 1
fi

for artifact in spec.md plan.md tasks.md; do
  if [[ ! -f "$FEATURE_DIR/$artifact" ]]; then
    echo "ERROR: $artifact 가 없습니다. speckit 프로세스를 먼저 완료하세요." >&2
    exit 1
  fi
done

# 검증 항목 수집
CHECKS=("$@")
if [[ ${#CHECKS[@]} -eq 0 ]]; then
  CHECKS=("manual")
fi

# state 디렉토리 생성
mkdir -p "$STATE_DIR"

# 마커 생성
CHECKS_JSON=$(printf '%s\n' "${CHECKS[@]}" | jq -R . | jq -s .)
jq -cn \
  --arg branch "$BRANCH" \
  --arg verified_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg feature_dir "$FEATURE_DIR" \
  --argjson checks "$CHECKS_JSON" \
  '{branch:$branch, verified_at:$verified_at, feature_dir:$feature_dir, checks:$checks}' \
  > "$MARKER"

echo "✓ 서브밋 마커 생성 완료 ($BRANCH)"
echo "  검증 항목: ${CHECKS[*]}"
echo "  마커 경로: $MARKER"
echo ""
echo "이제 git commit 이 허용됩니다."
