#!/usr/bin/env bash
# validate-quickstart-ev.sh
# quickstart.md의 각 시나리오 섹션에 `### Evidence` 서브섹션이 있고,
# 최소 1개 실행 증거(자동 테스트 경로 또는 체크된 수동 체크리스트)가
# 기록되어 있는지 검증한다.
#
# 정의:
#   - 시나리오 섹션: `## ...`로 시작하고 본문에 `### Scenario` 서브섹션이
#     하나 이상 있는 섹션
#   - Evidence 서브섹션: 같은 `##` 섹션 안의 `### Evidence`
#   - 유효한 증거 (둘 중 하나):
#       (a) 자동: "자동 테스트", "self-test", 또는 스크립트 경로(.sh/.py/.ts) 언급
#       (b) 수동: 최소 1개 `- [x]` 체크리스트 항목 (스크린샷/로그 경로 포함 권장)
#
# 설계: spec 010 US3, FR-005, PR #204.

set -eo pipefail

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

VIOLATIONS=0
# rollout phase: expand(=경고만) / migrate(=경고) / contract(=차단)
PHASE=$(harness_config_get '.rollout.phase' 'expand')

usage() {
    cat <<USAGE
Usage: $0 [--self-test] [--quiet] <quickstart.md>
       $0 [--self-test] [--quiet] --feature <feature-dir>

quickstart.md 각 '## <Section>' 중 '### Scenario'가 있는 섹션에 대해
'### Evidence' 서브섹션의 증거 존재 여부를 검증.

Exit:
  0 — 통과
  1 — 증거 누락 섹션 존재
  2 — 사용법 오류
USAGE
}

report_miss() {
    local file="$1" section="$2" reason="$3"
    VIOLATIONS=$((VIOLATIONS + 1))
    printf '%s: [%s] %s\n' "$file" "$section" "$reason" >&2
}

# quickstart.md 검사. 섹션별로 시나리오·Evidence 존재 + 증거 내용 검증.
validate_quickstart() {
    local file="$1"
    local section=""             # 현재 `## <title>` 제목
    local has_scenario=0         # 현재 섹션에 ### Scenario 존재?
    local has_evidence=0         # 현재 섹션에 ### Evidence 서브섹션 존재?
    local evidence_content=""    # Evidence 섹션 본문(한 덩어리)
    local in_evidence=0          # 현재 Evidence 서브섹션 본문 수집 중?
    local in_fence=0 fence_len=0

    while IFS= read -r rawline; do
        # 코드 펜스 처리 — 내용 수집/섹션 감지 모두 영향 없도록 상태만 유지
        if [[ "$rawline" =~ ^[[:space:]]*(\`\`\`+) ]]; then
            local this_len=${#BASH_REMATCH[1]}
            if [[ "$in_fence" -eq 0 ]]; then in_fence=1; fence_len=$this_len
            elif [[ "$this_len" -ge "$fence_len" ]]; then in_fence=0; fence_len=0
            fi
            # 펜스 내부는 Evidence 내용 수집에는 포함 (증거 표기 가능)
            [[ "$in_evidence" -eq 1 ]] && evidence_content+="${rawline}"$'\n'
            continue
        fi
        if [[ "$in_fence" -eq 1 ]]; then
            [[ "$in_evidence" -eq 1 ]] && evidence_content+="${rawline}"$'\n'
            continue
        fi

        # ## 최상위 섹션 전환. `###`은 regex 자체가 매칭되지 않음(# 다음에 공백 필요).
        if [[ "$rawline" =~ ^\#\#[[:space:]]+(.+)$ ]]; then
            local _section_title="${BASH_REMATCH[1]}"
            # 이전 섹션 마감 처리
            finalize_section "$file" "$section" "$has_scenario" "$has_evidence" "$evidence_content"
            # 새 섹션 시작
            section="$_section_title"
            has_scenario=0
            has_evidence=0
            evidence_content=""
            in_evidence=0
            continue
        fi

        # ### Scenario 감지
        if [[ "$rawline" =~ ^\#\#\#[[:space:]]+Scenario ]]; then
            has_scenario=1
            in_evidence=0
            continue
        fi

        # ### Evidence 감지
        if [[ "$rawline" =~ ^\#\#\#[[:space:]]+Evidence ]]; then
            has_evidence=1
            in_evidence=1
            continue
        fi

        # 다른 ### 서브섹션 진입 시 Evidence 수집 종료
        if [[ "$rawline" =~ ^\#\#\# ]]; then
            in_evidence=0
            continue
        fi

        # Evidence 본문 수집
        if [[ "$in_evidence" -eq 1 ]]; then
            evidence_content+="${rawline}"$'\n'
        fi
    done < "$file"

    # 파일 끝에서 마지막 섹션 마감
    finalize_section "$file" "$section" "$has_scenario" "$has_evidence" "$evidence_content"

    [[ "$VIOLATIONS" -eq 0 ]] && return 0 || return 1
}

finalize_section() {
    local file="$1" section="$2" has_scenario="$3" has_evidence="$4" content="$5"
    [[ -z "$section" ]] && return 0
    [[ "$has_scenario" -eq 0 ]] && return 0   # 시나리오 없는 섹션은 스킵

    if [[ "$has_evidence" -eq 0 ]]; then
        report_miss "$file" "$section" "### Evidence 서브섹션 없음"
        return 0
    fi

    # 증거 판정
    local has_auto=0 has_manual=0
    # 자동 테스트 시그널
    if echo "$content" | grep -qE '자동 테스트|self-test|\.sh|\.py|\.ts'; then
        has_auto=1
    fi
    # 수동 체크리스트 ([x] 있음)
    if echo "$content" | grep -qE '^\s*-\s+\[x\]'; then
        has_manual=1
    fi

    if [[ "$has_auto" -eq 0 ]] && [[ "$has_manual" -eq 0 ]]; then
        report_miss "$file" "$section" "Evidence에 자동 테스트 경로·체크된 수동 항목 둘 다 없음"
    fi
}

# === Self-test ===
run_self_test() {
    local tmpdir
    tmpdir=$(mktemp -d)
    trap 'rm -rf "$tmpdir"' EXIT

    # Case A: 통과 (auto + manual 모두 있음)
    cat > "$tmpdir/pass-auto.md" <<'EOF'
# QS

## Section Alpha

### Scenario A-1

기대: OK

### Evidence

- 자동 테스트: `.specify/scripts/bash/some.sh --self-test`
EOF

    cat > "$tmpdir/pass-manual.md" <<'EOF'
# QS

## Section Beta

### Scenario B-1

기대: OK

### Evidence

- 수동 체크리스트:
  - [x] B-1 확인 완료
EOF

    # Case B: 실패 (Evidence 없음)
    cat > "$tmpdir/fail-no-ev.md" <<'EOF'
# QS

## Section Gamma

### Scenario G-1

기대: OK
EOF

    # Case C: 실패 (Evidence는 있으나 증거 비어있음)
    cat > "$tmpdir/fail-empty-ev.md" <<'EOF'
# QS

## Section Delta

### Scenario D-1

### Evidence

- 스크린샷: TBD
EOF

    # Case D: 통과 — 시나리오 없는 섹션은 스킵
    cat > "$tmpdir/pass-no-scenario.md" <<'EOF'
# QS

## 소개

이 섹션은 시나리오가 없으므로 Evidence 불필요.
EOF

    local ok=1 v
    echo "=== Self-test: auto 증거 통과 ==="
    VIOLATIONS=0; validate_quickstart "$tmpdir/pass-auto.md" || true
    v=$VIOLATIONS; [[ "$v" -eq 0 ]] && echo "PASS (violations=0)" || { echo "FAIL expected 0 got $v" >&2; ok=0; }

    echo "=== Self-test: manual 증거 통과 ==="
    VIOLATIONS=0; validate_quickstart "$tmpdir/pass-manual.md" || true
    v=$VIOLATIONS; [[ "$v" -eq 0 ]] && echo "PASS (violations=0)" || { echo "FAIL expected 0 got $v" >&2; ok=0; }

    echo "=== Self-test: Evidence 없음 차단 ==="
    VIOLATIONS=0; validate_quickstart "$tmpdir/fail-no-ev.md" || true
    v=$VIOLATIONS; [[ "$v" -eq 1 ]] && echo "PASS (violations=1 expected)" || { echo "FAIL expected 1 got $v" >&2; ok=0; }

    echo "=== Self-test: Evidence 본문 빈약 차단 ==="
    VIOLATIONS=0; validate_quickstart "$tmpdir/fail-empty-ev.md" || true
    v=$VIOLATIONS; [[ "$v" -eq 1 ]] && echo "PASS (violations=1 expected)" || { echo "FAIL expected 1 got $v" >&2; ok=0; }

    echo "=== Self-test: 시나리오 없는 섹션 스킵 ==="
    VIOLATIONS=0; validate_quickstart "$tmpdir/pass-no-scenario.md" || true
    v=$VIOLATIONS; [[ "$v" -eq 0 ]] && echo "PASS (violations=0)" || { echo "FAIL expected 0 got $v" >&2; ok=0; }

    [[ "$ok" -eq 1 ]] && return 0 || return 1
}

# === Main ===
QUIET=0
FEATURE_DIR=""
QS_FILE=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help) usage; exit 0 ;;
        --self-test) run_self_test; exit $? ;;
        --feature) shift; FEATURE_DIR="${1:-}"; shift ;;
        --quiet) QUIET=1; shift ;;
        --) shift; break ;;
        -*) echo "error: unknown option: $1" >&2; usage >&2; exit 2 ;;
        *) QS_FILE="$1"; shift ;;
    esac
done

if [[ -n "$FEATURE_DIR" ]]; then
    QS_FILE="$FEATURE_DIR/quickstart.md"
fi
if [[ -z "$QS_FILE" ]]; then
    echo "error: quickstart.md 경로 필요" >&2; exit 2
fi
if [[ ! -f "$QS_FILE" ]]; then
    echo "error: not found: $QS_FILE" >&2; exit 2
fi

if validate_quickstart "$QS_FILE"; then
    [[ "$QUIET" -eq 0 ]] && echo "✓ quickstart evidence 검증 통과"
    exit 0
fi

# 위반 있음 — phase에 따라 차단/경고 분기
if [[ "$PHASE" == "contract" ]]; then
    echo "✗ quickstart evidence 위반: ${VIOLATIONS}건 (phase=contract, 차단)" >&2
    exit 1
else
    echo "⚠ quickstart evidence 경고: ${VIOLATIONS}건 (phase=${PHASE}, 비차단)" >&2
    exit 0
fi
