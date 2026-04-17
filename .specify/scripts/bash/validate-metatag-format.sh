#!/usr/bin/env bash
# validate-metatag-format.sh
# speckit 하네스 메타태그 4종(artifact/why/multi-step/migration-type)의 형식
# 정합성을 검증한다. 의미 검증(값의 실제 유효성, 파일 존재 등)은 수행하지 않는다.
#
# 설계: spec 010 FR-017, PR #204.
# 규약:
#   - 체크박스 라인(- [ ] / - [x])에 부착된 [key: value] 패턴만 대상
#   - 코드 펜스(```) 안과 HTML 주석(<!-- -->) 안은 스킵 (T005)
#   - key는 artifact|why|multi-step|migration-type 네 종만 인정
#   - 위 키 외의 [...] 대괄호는 일반 마크다운으로 간주하고 통과
#
# Exit:
#   0 — 위반 없음
#   1 — 위반 발견
#   2 — 사용법 오류

set -eo pipefail

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

ALLOWED_KEYS=(artifact why multi-step migration-type)
VIOLATIONS=0

usage() {
    cat <<USAGE
Usage: $0 [--self-test] [--quiet] <file> [file ...]

speckit 메타태그 4종의 형식 정합성을 검증한다.

Options:
  --self-test  내장 fixture로 허용 10건 + 거부 10건 동작 확인
  --quiet      통과 시 요약 출력 생략 (CI 용도)
  -h, --help   도움말

Exit codes:
  0 — 위반 없음
  1 — 위반 발견
  2 — 사용법 오류
USAGE
}

report_violation() {
    local file="$1" lineno="$2" msg="$3" line="$4"
    VIOLATIONS=$((VIOLATIONS + 1))
    printf '%s:%d: %s\n' "$file" "$lineno" "$msg" >&2
    printf '    > %s\n' "$line" >&2
}

# HTML 주석 제거: CLEANED_LINE 전역에 결과, IN_COMMENT 전역은 파일 전체 상태 유지.
# subshell에 넣으면 상태 변이가 소실되므로 전역 변수로 in-place 변환.
strip_html_comment() {
    local line="$1"
    local out=""
    while [[ -n "$line" ]]; do
        if [[ "$IN_COMMENT" -eq 1 ]]; then
            if [[ "$line" == *"-->"* ]]; then
                line="${line#*-->}"
                IN_COMMENT=0
            else
                line=""
            fi
        else
            if [[ "$line" == *"<!--"* ]]; then
                out="${out}${line%%<!--*}"
                line="${line#*<!--}"
                IN_COMMENT=1
            else
                out="${out}${line}"
                line=""
            fi
        fi
    done
    CLEANED_LINE="$out"
}

# 인라인 코드 스팬(`...`)을 제거. 백틱 쌍이 홀수로 남으면 그대로 둔다.
# 전역 CLEANED_LINE에서 in-place 변환.
strip_inline_code() {
    local line="$CLEANED_LINE"
    local out=""
    while [[ "$line" == *'`'*'`'* ]]; do
        out="${out}${line%%\`*}"
        line="${line#*\`}"
        line="${line#*\`}"
    done
    CLEANED_LINE="${out}${line}"
}

# migration-type 허용 값(harness.json에서 로드, 기본값 fallback)
migration_types_csv() {
    harness_config_get '.metatag.migrationTypes | join(",")' "schema-only,data-migration"
}

is_allowed_key() {
    local k="$1"
    for a in "${ALLOWED_KEYS[@]}"; do
        [[ "$a" == "$k" ]] && return 0
    done
    return 1
}

# 한 checkbox 라인을 검사. 위반 시 report_violation 호출.
validate_checkbox_line() {
    local file="$1" lineno="$2" line="$3" rawline="$4"
    local migration_csv
    migration_csv=$(migration_types_csv)

    # [....] 단위로 스캔. 중첩 [ 감지 포함.
    local scan="$line"
    while [[ "$scan" == *"["* ]]; do
        # 다음 [
        scan="${scan#*[}"
        if [[ "$scan" != *"]"* ]]; then
            # key: value로 보일 때만 unmatched로 보고 (일반 마크다운 [x] 같은 것 제외)
            if [[ "$scan" =~ ^[a-zA-Z][a-zA-Z0-9_-]*:[[:space:]] ]]; then
                report_violation "$file" "$lineno" \
                    "unmatched '[' without ']' for metatag" "$rawline"
            fi
            return
        fi
        local content="${scan%%]*}"
        scan="${scan#*]}"

        # 중첩 대괄호
        if [[ "$content" == *"["* ]]; then
            # metatag 후보인 경우만 위반 처리
            if [[ "$content" =~ ^[a-zA-Z][a-zA-Z0-9_-]*:[[:space:]] ]]; then
                report_violation "$file" "$lineno" \
                    "nested '[' inside metatag value: [$content]" "$rawline"
            fi
            continue
        fi

        # key: value 분리. 공백 오류 케이스 감지.
        # 1) 콜론 없음 → 일반 마크다운
        [[ "$content" == *":"* ]] || continue

        local before_colon="${content%%:*}"
        local after_colon="${content#*:}"

        # 2) key 뒤에 공백이 붙은 형태 "why :x" 같은 경우 감지 (공백 오류)
        if [[ "$before_colon" =~ [[:space:]]+$ ]]; then
            local trimmed_key="${before_colon%"${before_colon##*[![:space:]]}"}"
            if is_allowed_key "$trimmed_key"; then
                report_violation "$file" "$lineno" \
                    "whitespace before colon in [$content] — use [$trimmed_key: ...]" "$rawline"
                continue
            fi
            continue
        fi

        # 3) key가 허용 목록인지 확인. 아니면 일반 마크다운으로 간주하고 통과.
        local key="$before_colon"
        if ! is_allowed_key "$key"; then
            continue
        fi

        # 4) 콜론 직후 공백 필수
        if [[ ! "$after_colon" =~ ^[[:space:]]+ ]]; then
            report_violation "$file" "$lineno" \
                "missing space after colon in [$content] — use [$key: value]" "$rawline"
            continue
        fi

        # 5) 값 trim
        local value="${after_colon#"${after_colon%%[![:space:]]*}"}"
        value="${value%"${value##*[![:space:]]}"}"

        # 6) 빈 값
        if [[ -z "$value" ]]; then
            report_violation "$file" "$lineno" \
                "empty value for [$key]" "$rawline"
            continue
        fi

        # 7) 키별 추가 형식 검증
        case "$key" in
            multi-step)
                if [[ ! "$value" =~ ^[0-9]+$ ]] || [[ "$value" -lt 2 ]]; then
                    report_violation "$file" "$lineno" \
                        "[multi-step] value must be integer ≥ 2 (got: '$value')" "$rawline"
                fi
                ;;
            migration-type)
                local ok=0
                IFS=',' read -r -a types <<< "$migration_csv"
                for t in "${types[@]}"; do
                    [[ "$value" == "$t" ]] && ok=1 && break
                done
                if [[ "$ok" -eq 0 ]]; then
                    report_violation "$file" "$lineno" \
                        "[migration-type] value '$value' not in allowed list: $migration_csv" "$rawline"
                fi
                ;;
            artifact|why)
                # 형식 검증은 여기까지. 내용 검증은 다른 validator가 담당.
                :
                ;;
        esac
    done
}

# 한 파일 전체 검사
validate_file() {
    local file="$1"
    IN_COMMENT=0
    local in_fence=0
    local fence_len=0
    local lineno=0

    while IFS= read -r rawline; do
        lineno=$((lineno + 1))

        # 코드 펜스 처리 — CommonMark 규약: 여는 펜스 길이 ≤ 닫는 펜스 길이
        if [[ "$rawline" =~ ^[[:space:]]*(\`\`\`+) ]]; then
            local this_len=${#BASH_REMATCH[1]}
            if [[ "$in_fence" -eq 0 ]]; then
                in_fence=1
                fence_len=$this_len
            elif [[ "$this_len" -ge "$fence_len" ]]; then
                in_fence=0
                fence_len=0
            fi
            # 펜스 라인 자체는 내용 아님
            continue
        fi
        [[ "$in_fence" -eq 1 ]] && continue

        # HTML 주석 제거 (subshell 회피, 전역 CLEANED_LINE / IN_COMMENT 유지)
        CLEANED_LINE=""
        strip_html_comment "$rawline"

        # 체크박스 라인만 대상 (HTML 주석 제거 후 판단)
        [[ "$CLEANED_LINE" =~ ^[[:space:]]*-[[:space:]]+\[[[:space:]xX]\][[:space:]] ]] || continue

        # 인라인 코드 스팬(`...`) 제거 — 예시 표기가 태그로 오인되는 것을 방지
        strip_inline_code

        validate_checkbox_line "$file" "$lineno" "$CLEANED_LINE" "$rawline"
    done < "$file"
}

# === Self-test ===
run_self_test() {
    local tmpdir
    tmpdir=$(mktemp -d)
    trap 'rm -rf "$tmpdir"' EXIT

    local allow_file="$tmpdir/allow.md"
    local reject_file="$tmpdir/reject.md"

    # 허용 fixture 10건
    cat > "$allow_file" <<'EOF'
# Allow cases

- [ ] A1 설정 로드 [artifact: .specify/config/harness.json] [why: config-scaffold]
- [ ] A2 파서 [artifact: .specify/scripts/bash/validate-metatag-format.sh::skip_fenced] [why: metatag-parser]
- [ ] A3 다단 [multi-step: 2] [why: plan-tasks-coverage]
- [ ] A4 다단 큰 수 [multi-step: 10] [why: plan-tasks-coverage]
- [x] A5 완료 [artifact: docs/x.md] [why: docs]
- [ ] A6 스키마 [migration-type: schema-only] [why: schema]
- [ ] A7 데이터 [migration-type: data-migration] [why: backfill]
- [ ] A8 경로 심볼 [artifact: src/foo.ts::bar] [why: feat]
- [ ] A9 다중 태그 [artifact: x] [why: y] [multi-step: 2]
- [ ] A10 슬래시 포함 [artifact: docs/audits/drift/README.md] [why: docs-update]

## Inside a code fence — should skip

```
- [ ] NOT_CHECKED [artifact: ] [why:]
```

<!-- 주석 내부 — should skip
- [ ] COMMENT_SKIP [artifact: ] [why :]
-->

대괄호 포함 일반 텍스트는 통과: 리스트 [1], 각주 [^1], 체크박스 라벨 [x].
- 체크박스 없이 bullet만: [fake: value]  ← 검사 대상 아님.
EOF

    # 거부 fixture 10건
    cat > "$reject_file" <<'EOF'
# Reject cases

- [ ] R1 빈 값 [artifact: ] [why: x]
- [ ] R2 콜론 뒤 공백 없음 [artifact:x] [why: y]
- [ ] R3 공백 오류 [why :x]
- [ ] R4 multi-step 0 [multi-step: 0] [why: x]
- [ ] R5 multi-step 비숫자 [multi-step: two] [why: x]
- [ ] R6 multi-step 1 [multi-step: 1] [why: x]
- [ ] R7 migration-type 미허용 [migration-type: hybrid] [why: x]
- [ ] R8 unmatched bracket [artifact: x [why: y]
- [ ] R9 중첩 [artifact: [nested]] [why: y]
- [ ] R10 빈 why [artifact: x] [why: ]
EOF

    # 허용 파일 실행
    echo "=== Self-test: allow fixture ==="
    VIOLATIONS=0
    IN_COMMENT=0
    validate_file "$allow_file"
    local allow_v=$VIOLATIONS

    # 거부 파일 실행
    echo "=== Self-test: reject fixture ==="
    VIOLATIONS=0
    IN_COMMENT=0
    validate_file "$reject_file"
    local reject_v=$VIOLATIONS

    # 기대치
    local expected_reject=10
    local ok=1
    if [[ "$allow_v" -ne 0 ]]; then
        echo "FAIL: allow fixture violations=$allow_v (expected 0)" >&2
        ok=0
    else
        echo "PASS: allow fixture 위반 0건"
    fi
    if [[ "$reject_v" -ne "$expected_reject" ]]; then
        echo "FAIL: reject fixture violations=${reject_v} (expected ${expected_reject})" >&2
        ok=0
    else
        echo "PASS: reject fixture 위반 ${reject_v}건"
    fi

    [[ "$ok" -eq 1 ]] && return 0 || return 1
}

# === Main ===
QUIET=0
if [[ $# -eq 0 ]]; then
    usage >&2
    exit 2
fi
case "${1:-}" in
    -h|--help) usage; exit 0 ;;
    --self-test) run_self_test; exit $? ;;
esac
while [[ $# -gt 0 ]]; do
    case "$1" in
        --quiet) QUIET=1; shift ;;
        --self-test) run_self_test; exit $? ;;
        --) shift; break ;;
        -*) echo "error: unknown option: $1" >&2; usage >&2; exit 2 ;;
        *) break ;;
    esac
done

if [[ $# -eq 0 ]]; then
    echo "error: no file specified" >&2
    usage >&2
    exit 2
fi

for f in "$@"; do
    if [[ ! -f "$f" ]]; then
        echo "error: file not found: $f" >&2
        exit 2
    fi
    IN_COMMENT=0
    validate_file "$f"
done

if [[ "$VIOLATIONS" -eq 0 ]]; then
    [[ "$QUIET" -eq 0 ]] && echo "✓ metatag 형식 검증 통과 (위반 0건)"
    exit 0
else
    echo "✗ metatag 형식 위반: $VIOLATIONS 건" >&2
    exit 1
fi
