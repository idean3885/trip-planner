#!/usr/bin/env bash
# docs/**/*.md 파일의 상단 "대상 독자" 헤더 존재 검증 (spec 014).
# 근거: specs/014-landing-docs-refresh/contracts/docs-entry-schema.md
#
# 규약:
# - `docs/README.md`는 엔트리 문서라 제외.
# - 각 문서는 첫 H1 다음 3~6줄 이내에 `> **대상 독자**:` 패턴이 있어야 한다.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
DOCS_DIR="$REPO_ROOT/docs"
if [ ! -d "$DOCS_DIR" ]; then
  echo "error: docs/ not found" >&2
  exit 2
fi

fail=0
count_ok=0
count_total=0

while IFS= read -r -d '' file; do
  rel="${file#$REPO_ROOT/}"
  # 엔트리 문서들(docs/README.md, 각 그룹의 피처별 엔트리)은 제외
  case "$rel" in
    docs/README.md|docs/audits/README.md|docs/evidence/README.md|docs/research/README.md)
      continue
      ;;
    docs/evidence/*/README.md)
      continue
      ;;
  esac
  # audits/drift 디렉터리 등은 자동 생성물 → 제외
  case "$rel" in
    docs/audits/drift/*)
      continue
      ;;
  esac

  count_total=$((count_total + 1))

  # 첫 H1 줄 번호
  h1_line=$(grep -n '^# ' "$file" | head -1 | cut -d: -f1 || echo "")
  if [ -z "$h1_line" ]; then
    echo "✗ $rel — H1 없음" >&2
    fail=1
    continue
  fi
  # H1 직후 6줄 내에서 `> **대상 독자**:` 탐색
  window=$(sed -n "$((h1_line + 1)),$((h1_line + 6))p" "$file")
  if echo "$window" | grep -qE '^> \*\*대상 독자\*\*:'; then
    count_ok=$((count_ok + 1))
  else
    echo "✗ $rel — 상단에 '> **대상 독자**:' 한 줄이 없음" >&2
    fail=1
  fi
done < <(find "$DOCS_DIR" -type f -name '*.md' -print0)

if [ "$fail" -eq 0 ]; then
  echo "✓ docs 대상 독자 헤더 검증 통과 (${count_ok}/${count_total})"
  exit 0
fi
echo "✗ docs 대상 독자 헤더 위반 — ${count_ok}/${count_total} 통과" >&2
exit 1
