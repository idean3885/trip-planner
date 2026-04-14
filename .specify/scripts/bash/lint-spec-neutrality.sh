#!/usr/bin/env bash
# lint-spec-neutrality.sh — spec.md에서 기술 구체명 사용 여부를 검사한다.
#
# 사용법:
#   bash .specify/scripts/bash/lint-spec-neutrality.sh [spec.md 경로]
#
# 경로 미지정 시 현재 브랜치의 specs/{branch}/spec.md 를 자동 탐색한다.
#
# 종료 코드:
#   0 — 위반 없음
#   1 — 위반 발견 (stderr에 상세 출력)
#   2 — 파일/설정 오류

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
BLOCKLIST="$REPO_ROOT/.specify/config/tech-terms-blocklist.txt"

# 블록리스트 파일 확인
if [[ ! -f "$BLOCKLIST" ]]; then
  echo "ERROR: 블록리스트 파일이 없습니다: $BLOCKLIST" >&2
  exit 2
fi

# spec.md 경로 결정
SPEC_FILE="${1:-}"
if [[ -z "$SPEC_FILE" ]]; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
  if [[ "$BRANCH" =~ ^([0-9]{3})- ]]; then
    PREFIX="${BASH_REMATCH[1]}"
    FEATURE_DIR=$(find "$REPO_ROOT/specs" -maxdepth 1 -name "${PREFIX}-*" -type d 2>/dev/null | head -1)
    if [[ -n "$FEATURE_DIR" ]]; then
      SPEC_FILE="$FEATURE_DIR/spec.md"
    fi
  fi
fi

if [[ -z "$SPEC_FILE" || ! -f "$SPEC_FILE" ]]; then
  echo "ERROR: spec.md를 찾을 수 없습니다. 경로를 지정하거나 피처 브랜치에서 실행하세요." >&2
  exit 2
fi

# 블록리스트에서 패턴 추출 (주석, 빈 줄 제외)
PATTERNS=()
while IFS= read -r line; do
  # 주석과 빈 줄 스킵
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  # 앞뒤 공백 제거
  line=$(echo "$line" | xargs)
  [[ -n "$line" ]] && PATTERNS+=("$line")
done < "$BLOCKLIST"

if [[ ${#PATTERNS[@]} -eq 0 ]]; then
  echo "WARNING: 블록리스트에 유효한 패턴이 없습니다." >&2
  exit 0
fi

# Input 라인 제외 (사용자 원문은 기술명 포함 가능)
# Feature Branch 라인 제외
# 스펙 본문만 검사
VIOLATIONS=()
VIOLATION_COUNT=0

while IFS= read -r pattern; do
  # spec.md에서 패턴 검색 (Input/Feature Branch 라인 제외)
  MATCHES=$(grep -inE "$pattern" "$SPEC_FILE" 2>/dev/null | grep -v "^\s*\*\*Input\*\*:" | grep -v "^\s*\*\*Feature Branch\*\*:" || true)

  if [[ -n "$MATCHES" ]]; then
    while IFS= read -r match; do
      VIOLATIONS+=("  [$pattern] $match")
      VIOLATION_COUNT=$((VIOLATION_COUNT + 1))
    done <<< "$MATCHES"
  fi
done < <(printf '%s\n' "${PATTERNS[@]}")

# 결과 출력
if [[ $VIOLATION_COUNT -eq 0 ]]; then
  echo "✓ spec.md 기술 중립성 검증 통과 (위반 0건)"
  echo "  검사 파일: $SPEC_FILE"
  echo "  검사 패턴: ${#PATTERNS[@]}개"
  exit 0
else
  echo "✗ spec.md 기술 중립성 위반 발견: ${VIOLATION_COUNT}건" >&2
  echo "" >&2
  echo "위반 목록:" >&2
  for v in "${VIOLATIONS[@]}"; do
    echo "$v" >&2
  done
  echo "" >&2
  echo "→ 기술 구체명을 중립 표현으로 교체하세요." >&2
  echo "→ 구체적 기술 결정은 plan.md에서 다룹니다." >&2
  echo "" >&2
  echo "검사 파일: $SPEC_FILE" >&2
  echo "블록리스트: $BLOCKLIST" >&2
  exit 1
fi
