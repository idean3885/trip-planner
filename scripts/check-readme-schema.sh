#!/usr/bin/env bash
# README.md 구조 계약 검증 (spec 014).
# 근거: specs/014-landing-docs-refresh/contracts/readme-schema.md
#
# 1. `trip.idean.me` 링크 노출 ≤ 2회
# 2. 독자 3층 헤더 모두 존재
# 3. 필수 내부 링크 존재 (docs/README.md, CHANGELOG.md)

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
README="$REPO_ROOT/README.md"

if [ ! -f "$README" ]; then
  echo "error: README.md not found at $README" >&2
  exit 2
fi

fail=0

# 1. trip.idean.me 노출 횟수
count=$(grep -c "trip.idean.me" "$README" || true)
if [ "$count" -gt 2 ]; then
  echo "✗ trip.idean.me 노출이 ${count}회(기준: 2회 이하)" >&2
  fail=1
fi

# 2. 독자 3층 헤더
check_header() {
  local header="$1"
  if ! grep -qE "^### $header" "$README"; then
    echo "✗ 독자 섹션 헤더 누락: '### $header'" >&2
    fail=1
  fi
}
check_header "써보고 싶은 분"
check_header "코드를 보고 싶은 분"
check_header "운영·감사 관점"

# 3. 필수 내부 링크
check_link() {
  local pattern="$1"
  local label="$2"
  if ! grep -qF "$pattern" "$README"; then
    echo "✗ 필수 링크 누락: $label ($pattern)" >&2
    fail=1
  fi
}
check_link "docs/README.md" "개발 문서 엔트리"
check_link "CHANGELOG.md" "변경 이력"
check_link "docs/WORKFLOW.md" "업무 프로세스"

if [ "$fail" -eq 0 ]; then
  echo "✓ README 구조 계약 통과 (trip.idean.me ${count}회, 3층 헤더 ✓, 필수 링크 ✓)"
  exit 0
fi
exit 1
