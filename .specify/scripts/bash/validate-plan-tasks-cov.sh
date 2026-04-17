#!/usr/bin/env bash
# validate-plan-tasks-cov.sh
# plan.md 최상위 bullet ↔ tasks.md 태스크 간 [why] 태그 매핑을 검증한다.
# - plan.md의 top-level bullet에 [why: <tag>]가 있으면 "tracked" 항목으로 간주
# - tasks.md의 checkbox 라인에 [why: <tag>]가 있으면 태스크로 카운트
# - 매 tracked plan 항목의 [why] 태그에 대해 같은 [why] 태스크가 최소 1건
#   (혹은 [multi-step: N]이 있으면 N건) 존재해야 한다.
#
# 설계: spec 010 FR-001/002, PR #204.
# 의미 검증 금지 (FR-017): tag 문자열 일치만 비교한다.
#
# Exit:
#   0 — 통과
#   1 — 커버리지 위반
#   2 — 사용법 오류

set -eo pipefail

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

VIOLATIONS=0

usage() {
    cat <<USAGE
Usage: $0 [--self-test] [--quiet] --feature <feature-dir>
   or: $0 [--self-test] [--quiet] <plan.md> <tasks.md>

plan.md의 추적 대상 bullet(= [why]를 가진 최상위 bullet)이 tasks.md에
충분히 매핑되어 있는지 검증.

Options:
  --feature <dir>  specs/…/<feature> 디렉토리. 내부 plan.md, tasks.md 사용
  --self-test      내장 fixture로 동작 검증
  --quiet          통과 시 요약 출력 생략
  -h, --help       도움말
USAGE
}

# HTML 주석 제거. 전역 IN_COMMENT 상태 유지.
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

# 인라인 코드 스팬(`...`) 제거. CLEANED_LINE in-place.
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

# 한 줄에서 [key: value] 형태 태그값을 추출. 여러 개면 공백 분리.
# 형식 검증은 validate-metatag-format.sh 책임. 여기선 관용적 파싱.
extract_tag_value() {
    local line="$1" key="$2" values=""
    while [[ "$line" == *"[$key:"* ]]; do
        line="${line#*[$key:}"
        local content="${line%%]*}"
        line="${line#*]}"
        # trim
        local v="${content#"${content%%[![:space:]]*}"}"
        v="${v%"${v##*[![:space:]]}"}"
        [[ -n "$v" ]] && values="$values $v"
    done
    echo "${values# }"
}

# plan.md에서 추적 대상 bullet의 why+multi 쌍을 stdout으로.
# 형식: "<why>|<multi-step-or-1>" 줄 단위.
parse_plan() {
    local file="$1"
    IN_COMMENT=0
    local in_fence=0 fence_len=0 lineno=0

    while IFS= read -r rawline; do
        lineno=$((lineno + 1))
        # 코드 펜스
        if [[ "$rawline" =~ ^[[:space:]]*(\`\`\`+) ]]; then
            local this_len=${#BASH_REMATCH[1]}
            if [[ "$in_fence" -eq 0 ]]; then
                in_fence=1; fence_len=$this_len
            elif [[ "$this_len" -ge "$fence_len" ]]; then
                in_fence=0; fence_len=0
            fi
            continue
        fi
        [[ "$in_fence" -eq 1 ]] && continue

        CLEANED_LINE=""
        strip_html_comment "$rawline"

        # 최상위 bullet만: 줄 앞 공백 없이 `- ` 또는 `* ` 또는 `<digit>. `
        [[ "$CLEANED_LINE" =~ ^(-[[:space:]]+|\*[[:space:]]+|[0-9]+\.[[:space:]]+) ]] || continue

        strip_inline_code

        # [why: xxx] 추출
        local why_vals
        why_vals=$(extract_tag_value "$CLEANED_LINE" "why")
        [[ -z "$why_vals" ]] && continue

        # [multi-step: N] — 있으면 사용, 없으면 1
        local multi_vals multi=1
        multi_vals=$(extract_tag_value "$CLEANED_LINE" "multi-step")
        if [[ -n "$multi_vals" ]]; then
            # 여러 multi-step가 있다면 첫 값만 사용
            multi=$(echo "$multi_vals" | awk '{print $1}')
        fi

        # 한 bullet에 여러 why가 있을 수 있음 — 각각에 multi 적용
        for w in $why_vals; do
            echo "$w|$multi|$lineno"
        done
    done < "$file"
}

# tasks.md에서 checkbox 라인의 why 태그를 stdout으로.
# 형식: "<why>" 줄 단위.
parse_tasks() {
    local file="$1"
    IN_COMMENT=0
    local in_fence=0 fence_len=0

    while IFS= read -r rawline; do
        if [[ "$rawline" =~ ^[[:space:]]*(\`\`\`+) ]]; then
            local this_len=${#BASH_REMATCH[1]}
            if [[ "$in_fence" -eq 0 ]]; then
                in_fence=1; fence_len=$this_len
            elif [[ "$this_len" -ge "$fence_len" ]]; then
                in_fence=0; fence_len=0
            fi
            continue
        fi
        [[ "$in_fence" -eq 1 ]] && continue

        CLEANED_LINE=""
        strip_html_comment "$rawline"

        # 체크박스 라인만 (들여쓰기 허용)
        [[ "$CLEANED_LINE" =~ ^[[:space:]]*-[[:space:]]+\[[[:space:]xX]\][[:space:]] ]] || continue

        strip_inline_code

        local why_vals
        why_vals=$(extract_tag_value "$CLEANED_LINE" "why")
        [[ -z "$why_vals" ]] && continue
        for w in $why_vals; do
            echo "$w"
        done
    done < "$file"
}

report_miss() {
    local why="$1" required="$2" actual="$3" plan_line="$4"
    VIOLATIONS=$((VIOLATIONS + 1))
    printf 'plan.md:%d: [why: %s] requires >=%d tasks, found %d\n' \
        "$plan_line" "$why" "$required" "$actual" >&2
}

# 핵심 비교: plan의 각 (why, multi)에 대해 tasks의 same why 카운트 확인.
run_coverage() {
    local plan="$1" tasks="$2"
    if [[ ! -f "$plan" ]]; then
        echo "error: plan.md not found: $plan" >&2
        return 2
    fi
    if [[ ! -f "$tasks" ]]; then
        echo "error: tasks.md not found: $tasks" >&2
        return 2
    fi

    local plan_entries tasks_whys
    plan_entries=$(parse_plan "$plan")
    tasks_whys=$(parse_tasks "$tasks")

    if [[ -z "$plan_entries" ]]; then
        echo "ℹ plan.md에 추적 대상(bullet + [why]) 없음 — 통과"
        return 0
    fi

    # 각 plan 항목 확인
    while IFS='|' read -r why multi plan_line; do
        [[ -z "$why" ]] && continue
        local count=0
        # count exact-match why
        if [[ -n "$tasks_whys" ]]; then
            count=$(printf '%s\n' "$tasks_whys" | awk -v w="$why" '$0 == w' | wc -l | tr -d ' ')
        fi
        if [[ "$count" -lt "$multi" ]]; then
            report_miss "$why" "$multi" "$count" "$plan_line"
        fi
    done <<< "$plan_entries"

    [[ "$VIOLATIONS" -eq 0 ]] && return 0 || return 1
}

# === Self-test ===
run_self_test() {
    local tmpdir
    tmpdir=$(mktemp -d)
    trap 'rm -rf "$tmpdir"' EXIT

    # Case 1: PASS — 모든 plan [why]가 tasks에 충분히 매핑
    local p1="$tmpdir/plan-pass.md"
    local t1="$tmpdir/tasks-pass.md"
    cat > "$p1" <<'EOF'
## Coverage Targets

- 구현 항목 A [why: alpha]
- 구현 항목 B [why: beta] [multi-step: 3]
- 정보 항목 (no why — untracked)
EOF
    cat > "$t1" <<'EOF'
- [ ] T1 [artifact: x] [why: alpha]
- [ ] T2 [artifact: y] [why: beta]
- [ ] T3 [artifact: z] [why: beta]
- [x] T4 [artifact: w] [why: beta]
EOF

    # Case 2: FAIL — beta가 3 필요하지만 2만 있음
    local p2="$tmpdir/plan-fail.md"
    local t2="$tmpdir/tasks-fail.md"
    cat > "$p2" <<'EOF'
- 구현 항목 [why: gamma] [multi-step: 3]
EOF
    cat > "$t2" <<'EOF'
- [ ] T1 [why: gamma]
- [ ] T2 [why: gamma]
EOF

    # Case 3: FAIL — plan에 why가 있는데 tasks에 해당 why가 없음
    local p3="$tmpdir/plan-missing.md"
    local t3="$tmpdir/tasks-missing.md"
    cat > "$p3" <<'EOF'
- 구현 [why: delta]
EOF
    cat > "$t3" <<'EOF'
- [ ] T1 [why: other]
EOF

    local ok=1

    echo "=== Self-test: PASS case ==="
    VIOLATIONS=0
    run_coverage "$p1" "$t1" || true
    if [[ "$VIOLATIONS" -eq 0 ]]; then
        echo "PASS: case 1 violations=0"
    else
        echo "FAIL: case 1 expected 0, got $VIOLATIONS" >&2
        ok=0
    fi

    echo "=== Self-test: multi-step 부족 ==="
    VIOLATIONS=0
    run_coverage "$p2" "$t2" || true
    if [[ "$VIOLATIONS" -eq 1 ]]; then
        echo "PASS: case 2 violations=1 (expected)"
    else
        echo "FAIL: case 2 expected 1, got $VIOLATIONS" >&2
        ok=0
    fi

    echo "=== Self-test: why 미매핑 ==="
    VIOLATIONS=0
    run_coverage "$p3" "$t3" || true
    if [[ "$VIOLATIONS" -eq 1 ]]; then
        echo "PASS: case 3 violations=1 (expected)"
    else
        echo "FAIL: case 3 expected 1, got $VIOLATIONS" >&2
        ok=0
    fi

    [[ "$ok" -eq 1 ]] && return 0 || return 1
}

# === Main ===
QUIET=0
FEATURE_DIR=""
PLAN_FILE=""
TASKS_FILE=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help) usage; exit 0 ;;
        --self-test) run_self_test; exit $? ;;
        --quiet) QUIET=1; shift ;;
        --feature)
            shift
            [[ -z "${1:-}" ]] && { echo "error: --feature requires directory" >&2; exit 2; }
            FEATURE_DIR="$1"; shift ;;
        --) shift; break ;;
        -*) echo "error: unknown option: $1" >&2; usage >&2; exit 2 ;;
        *)
            if [[ -z "$PLAN_FILE" ]]; then PLAN_FILE="$1"
            elif [[ -z "$TASKS_FILE" ]]; then TASKS_FILE="$1"
            else echo "error: too many args" >&2; exit 2
            fi
            shift ;;
    esac
done

if [[ -n "$FEATURE_DIR" ]]; then
    PLAN_FILE="$FEATURE_DIR/plan.md"
    TASKS_FILE="$FEATURE_DIR/tasks.md"
fi
if [[ -z "$PLAN_FILE" || -z "$TASKS_FILE" ]]; then
    echo "error: need --feature <dir> or <plan.md> <tasks.md>" >&2
    usage >&2
    exit 2
fi

if run_coverage "$PLAN_FILE" "$TASKS_FILE"; then
    [[ "$QUIET" -eq 0 ]] && echo "✓ plan↔tasks 커버리지 검증 통과"
    exit 0
else
    echo "✗ plan↔tasks 커버리지 위반: ${VIOLATIONS}건" >&2
    exit 1
fi
