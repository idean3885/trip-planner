#!/usr/bin/env bash
# scripts/check-legacy-utilities.sh
# 스펙 013 FR-002 / contracts/legacy-removal.md 계약 구현.
#
# 레거시 커스텀 유틸리티 이름이 `src/**`·`styles/**`에서 발견되지 않아야 통과.
# 의도된 예외 경로(`changes/*.md`, 이전 스펙 디렉토리, 감사 보고서, 본 스펙 디렉토리)
# 는 기본적으로 스캔 범위 밖(src/·styles/만 스캔).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# 스펙 013 legacy 패턴. sky/orange/violet/emerald/pink 등 Tailwind 기본 팔레트는
# 제거 대상이 아님(활용 중 — ActivityCard 카테고리 뱃지).
PATTERNS=(
  'rounded-card\b'
  'shadow-card\b'
  'shadow-card-hover\b'
  'shadow-fab\b'
  'bg-primary-[0-9]{2,3}\b'
  'text-primary-[0-9]{2,3}\b'
  'border-primary-[0-9]{2,3}\b'
  'bg-surface-[0-9]{1,3}\b'
  'text-surface-[0-9]{1,3}\b'
  'border-surface-[0-9]{1,3}\b'
  'text-heading-(lg|md|sm|xs)\b'
  'text-body-(lg|md|sm|xs)\b'
  'max-w-content\b'
  '--color-(primary|surface)-[0-9]{1,3}\b'
  '--shadow-(card|card-hover|fab)\b'
  '--radius-card\b'
  '--max-width-content\b'
)

SCAN_DIRS=()
for dir in src styles; do
  [[ -d "$dir" ]] && SCAN_DIRS+=("$dir")
done

if [[ ${#SCAN_DIRS[@]} -eq 0 ]]; then
  echo "ERROR: scan dirs (src, styles) not found" >&2
  exit 3
fi

pattern_alt="$(IFS='|'; echo "${PATTERNS[*]}")"

violations_file="$(mktemp)"
trap 'rm -f "$violations_file"' EXIT

# -E: extended regex, -r: recursive, -n: line numbers. 바이너리 제외.
grep -rEn --binary-files=without-match "$pattern_alt" "${SCAN_DIRS[@]}" \
  > "$violations_file" 2>/dev/null || true

count="$(wc -l < "$violations_file" | tr -d ' ')"

if [[ "$count" == "0" ]]; then
  echo "✓ legacy-utility 검증 통과 (위반 0건, 스캔: ${SCAN_DIRS[*]})"
  exit 0
fi

echo "FAIL: ${count}건의 레거시 유틸리티 사용 발견" >&2
cat "$violations_file" >&2
echo "" >&2
echo "→ 계약 문서: specs/013-shadcn-phase2/contracts/legacy-removal.md" >&2
echo "→ 치환 가이드: 위 문서의 'Tailwind 유틸리티 클래스' 표 참조" >&2
exit 2
