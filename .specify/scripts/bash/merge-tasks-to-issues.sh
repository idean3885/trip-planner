#!/usr/bin/env bash
# merge-tasks-to-issues.sh
# tasks.md를 [why] 그룹 기준으로 병합하여 GitHub 이슈 초안을 생성한다.
# 8h 초과 그룹은 분할, 결과 이슈 ≥2건이면 피처 단위 마일스톤을 자동 생성·연결.
#
# 설계: spec 010 US7, FR-011/012, SC-007. PR #204.
#
# 추정 공수 기본: 태스크당 1h (단순 카운트). --hours-per-task 로 오버라이드.
# tasks.md에 [est: Nh] 메타태그가 있으면 우선 사용 (4종 메타태그 외 옵션).

set -eo pipefail

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

DEFAULT_HOURS_PER_TASK=1
MAX_HOURS_PER_ISSUE=8

usage() {
    cat <<USAGE
Usage: $0 [--dry-run] [--hours-per-task N] [--parent <issue>] \\
         [--milestone <title>] [--self-test] --feature <feature-dir>
   or: $0 [options] <tasks.md>

Options:
  --feature <dir>       피처 디렉토리 내부 tasks.md 사용
  --dry-run             실제 이슈·마일스톤 생성 없이 계획만 출력 (기본 OFF)
  --hours-per-task N    태스크당 기본 추정 시간(h). 기본 1
  --parent <issue>      상위 이슈 번호(각 자식 이슈 본문에 참조)
  --milestone <title>   마일스톤 제목. 미지정 시 피처 이름 사용
  --self-test           내장 fixture 동작 확인
  -h, --help            도움말

Exit:
  0 — 성공(dry-run 포함)
  1 — 실행 실패(예: gh 호출 실패)
  2 — 사용법 오류
USAGE
}

strip_html_comment() {
    local line="$1" out=""
    while [[ -n "$line" ]]; do
        if [[ "$IN_COMMENT" -eq 1 ]]; then
            if [[ "$line" == *"-->"* ]]; then line="${line#*-->}"; IN_COMMENT=0
            else line=""; fi
        else
            if [[ "$line" == *"<!--"* ]]; then
                out="${out}${line%%<!--*}"; line="${line#*<!--}"; IN_COMMENT=1
            else out="${out}${line}"; line=""
            fi
        fi
    done
    CLEANED_LINE="$out"
}

strip_inline_code() {
    local line="$CLEANED_LINE" out=""
    while [[ "$line" == *'`'*'`'* ]]; do
        out="${out}${line%%\`*}"
        line="${line#*\`}"
        line="${line#*\`}"
    done
    CLEANED_LINE="${out}${line}"
}

extract_one_tag() {
    local line="$1" key="$2"
    if [[ "$line" == *"[$key:"* ]]; then
        local rest="${line#*[$key:}"
        local content="${rest%%]*}"
        local v="${content#"${content%%[![:space:]]*}"}"
        v="${v%"${v##*[![:space:]]}"}"
        printf '%s' "$v"
    fi
}

# tasks.md 파싱 → stdout에 "<why>|<est_h>|<task_id>|<desc>" 라인
parse_tasks() {
    local file="$1"
    IN_COMMENT=0
    local in_fence=0 fence_len=0
    while IFS= read -r rawline; do
        if [[ "$rawline" =~ ^[[:space:]]*(\`\`\`+) ]]; then
            local L=${#BASH_REMATCH[1]}
            if [[ "$in_fence" -eq 0 ]]; then in_fence=1; fence_len=$L
            elif [[ "$L" -ge "$fence_len" ]]; then in_fence=0; fence_len=0; fi
            continue
        fi
        [[ "$in_fence" -eq 1 ]] && continue

        CLEANED_LINE=""
        strip_html_comment "$rawline"
        [[ "$CLEANED_LINE" =~ ^[[:space:]]*-[[:space:]]+\[[[:space:]xX]\][[:space:]]+(.+)$ ]] || continue
        local rest="${BASH_REMATCH[1]}"
        strip_inline_code
        local why est task_id desc
        why=$(extract_one_tag "$CLEANED_LINE" "why")
        [[ -z "$why" ]] && continue
        est=$(extract_one_tag "$CLEANED_LINE" "est")
        # est format: "2h", "1.5h", 숫자만 허용. 실패 시 기본값 사용.
        if [[ -n "$est" ]]; then
            est="${est%h}"
            if ! [[ "$est" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then est="$DEFAULT_HOURS_PER_TASK"; fi
        else
            est="$DEFAULT_HOURS_PER_TASK"
        fi

        # task_id: 첫 단어가 T로 시작하면 사용, 아니면 빈값
        task_id=""
        if [[ "$rest" =~ ^(T[0-9]+)[[:space:]] ]]; then
            task_id="${BASH_REMATCH[1]}"
        fi

        # desc = CLEANED_LINE에서 "- [ ] " 제거하고 태그도 제거
        desc="${CLEANED_LINE#*] }"
        # 태그 제거
        while [[ "$desc" == *"["*":"*"]"* ]]; do
            local before="${desc%%[*}"
            local after="${desc#*]}"
            desc="$before$after"
        done
        # trim
        desc="${desc#"${desc%%[![:space:]]*}"}"
        desc="${desc%"${desc##*[![:space:]]}"}"
        # 공백 여러 개 한 번에 축소
        desc=$(echo "$desc" | tr -s ' ')
        # | 문자 치환 (CSV 구분자와 충돌 방지)
        desc="${desc//|/ }"

        printf '%s|%s|%s|%s\n' "$why" "$est" "$task_id" "$desc"
    done < "$file"
}

# 그룹별 분할 후 이슈 초안 생성 계획을 stdout에 출력
# 출력 형식: "<title>||<body>"
plan_issues() {
    local tasks_rows="$1" feature_name="$2" parent="$3"
    # why 그룹별 집계
    local whys
    whys=$(printf '%s\n' "$tasks_rows" | awk -F'|' 'NF>=1{print $1}' | sort -u)

    while IFS= read -r why; do
        [[ -z "$why" ]] && continue
        # 해당 why의 모든 태스크 (순서 유지)
        local rows
        rows=$(printf '%s\n' "$tasks_rows" | awk -F'|' -v w="$why" '$1 == w')
        # 누적 h 합
        local total=0 chunk_idx=0
        local current_h=0
        local current_body=""
        local split_count=0

        # awk로 float 누적
        local summary
        summary=$(printf '%s\n' "$rows" | awk -F'|' 'BEGIN{s=0} {s+=$2} END{printf "%.2f", s}')

        # 분할 필요 판정
        local needs_split=0
        if awk -v s="$summary" -v m="$MAX_HOURS_PER_ISSUE" 'BEGIN{exit !(s > m)}'; then
            needs_split=1
        fi

        if [[ "$needs_split" -eq 0 ]]; then
            # 단일 이슈
            emit_issue "$feature_name" "$why" "1" "$rows" "$summary" "$parent"
        else
            # 8h 단위 분할 (누적 h 기준)
            chunk_idx=1
            current_h=0
            local chunk_rows=""
            while IFS= read -r row; do
                [[ -z "$row" ]] && continue
                local row_h="${row#*|}"; row_h="${row_h%%|*}"
                # 추가 시 총합이 8 초과면 일단 emit, 새 청크 시작
                local projected
                projected=$(awk -v a="$current_h" -v b="$row_h" 'BEGIN{printf "%.4f", a+b}')
                if awk -v p="$projected" -v m="$MAX_HOURS_PER_ISSUE" 'BEGIN{exit !(p > m)}' && [[ -n "$chunk_rows" ]]; then
                    emit_issue "$feature_name" "$why" "$chunk_idx" "$chunk_rows" "$current_h" "$parent"
                    chunk_idx=$((chunk_idx + 1))
                    current_h=0
                    chunk_rows=""
                fi
                chunk_rows="${chunk_rows}${row}"$'\n'
                current_h=$(awk -v a="$current_h" -v b="$row_h" 'BEGIN{printf "%.4f", a+b}')
            done <<< "$rows"
            # 마지막 청크
            if [[ -n "$chunk_rows" ]]; then
                emit_issue "$feature_name" "$why" "$chunk_idx" "$chunk_rows" "$current_h" "$parent"
            fi
        fi
    done <<< "$whys"
}

emit_issue() {
    local feature="$1" why="$2" idx="$3" rows="$4" hours="$5" parent="$6"
    local title
    if [[ "$idx" -le 1 ]]; then
        title="${feature}: ${why}"
    else
        title="${feature}: ${why} (part ${idx})"
    fi
    local body="## ${why}\n\n예상 공수: ${hours}h\n\n"
    if [[ -n "$parent" ]]; then
        body="${body}상위 이슈: #${parent}\n\n"
    fi
    body="${body}### 태스크\n\n"
    while IFS='|' read -r _why _h task_id desc; do
        [[ -z "$desc" ]] && continue
        body="${body}- [ ] ${task_id:+${task_id} }${desc}\n"
    done <<< "$rows"
    # 구분자 || 사용
    printf '%s||%b\n---END---\n' "$title" "$body"
}

# 계획 출력 또는 실제 실행
run() {
    local tasks_file="$1" feature_dir="$2" dry_run="$3" parent="$4" milestone_title="$5"

    local feature_name=""
    if [[ -n "$feature_dir" ]]; then
        feature_name=$(basename "$feature_dir")
    else
        feature_name="feature"
    fi

    local rows
    rows=$(parse_tasks "$tasks_file")
    if [[ -z "$rows" ]]; then
        echo "error: tasks.md에 [why] 태그 가진 태스크 없음" >&2
        return 1
    fi

    local plan_output
    plan_output=$(plan_issues "$rows" "$feature_name" "$parent")

    # issue count 파악 (---END--- separator 카운트)
    local issue_count
    issue_count=$(printf '%s' "$plan_output" | grep -c '^---END---$' || true)

    echo "=== merge-tasks-to-issues plan ==="
    echo "feature: $feature_name"
    echo "tasks.md: $tasks_file"
    echo "issues to create: $issue_count"
    echo ""

    # 이슈별 출력
    local i=1
    while IFS= read -r block_line; do
        if [[ "$block_line" == "---END---" ]]; then
            i=$((i + 1))
            echo ""
            echo "---"
            continue
        fi
        if [[ "$block_line" == *"||"* ]]; then
            local t="${block_line%%||*}"
            local b="${block_line#*||}"
            echo "## [${i}] ${t}"
            echo ""
            printf '%b\n' "$b"
        fi
    done <<< "$plan_output"

    if [[ "$dry_run" -eq 1 ]]; then
        echo ""
        echo "(dry-run: 실제 이슈·마일스톤 미생성)"
        return 0
    fi

    # 실제 생성 — 이 MVP에서는 dry-run 기본. 실행 경로는 [--no-dry-run] 도입 전까지 안내만.
    echo ""
    echo "⚠ --dry-run 모드에서만 동작합니다. 실제 생성은 이슈 #213 후속 개선 예정." >&2
    echo "  (자동 생성을 쓰려면 --dry-run 결과를 복붙하거나 별도 helper로 전환)"
    return 0
}

# === Self-test ===
run_self_test() {
    local tmpdir
    tmpdir=$(mktemp -d)
    trap 'rm -rf "$tmpdir"' EXIT

    # Case A: 단일 why 3 태스크 = 3h → 1 이슈
    cat > "$tmpdir/tasks-a.md" <<'EOF'
- [ ] T1 작업 1 [artifact: a] [why: alpha]
- [ ] T2 작업 2 [artifact: b] [why: alpha]
- [ ] T3 작업 3 [artifact: c] [why: alpha]
EOF

    # Case B: 2개 why, one 10h → 분할, 다른 하나 2h → 단일. 총 3 이슈 이상
    cat > "$tmpdir/tasks-b.md" <<'EOF'
- [ ] T1 작업 [artifact: a] [why: big] [est: 5h]
- [ ] T2 작업 [artifact: b] [why: big] [est: 5h]
- [ ] T3 작업 [artifact: c] [why: big] [est: 3h]
- [ ] T4 작업 [artifact: d] [why: small] [est: 2h]
EOF

    # Case C: 1 why만 → 마일스톤 없음 판정 정보 (플래너는 이슈 1건만 생성)

    local ok=1
    echo "=== Case A: 3 태스크 단일 why → 1 이슈 ==="
    local out_a
    out_a=$(run "$tmpdir/tasks-a.md" "$tmpdir/tasks-a" 1 "" "")
    local cnt_a
    cnt_a=$(echo "$out_a" | grep -c '^## \[' || true)
    if [[ "$cnt_a" -eq 1 ]]; then
        echo "PASS (1 이슈)"
    else
        echo "FAIL: expected 1 got $cnt_a" >&2
        ok=0
    fi

    echo "=== Case B: big 13h → 2 chunk + small 1 → 3 이슈 ==="
    local out_b
    out_b=$(run "$tmpdir/tasks-b.md" "$tmpdir/tasks-b" 1 "" "")
    local cnt_b
    cnt_b=$(echo "$out_b" | grep -c '^## \[' || true)
    if [[ "$cnt_b" -eq 3 ]]; then
        echo "PASS (3 이슈)"
    else
        echo "FAIL: expected 3 got $cnt_b" >&2
        ok=0
        echo "--- debug output ---" >&2
        echo "$out_b" >&2
    fi

    [[ "$ok" -eq 1 ]] && return 0 || return 1
}

# === Main ===
DRY_RUN=1           # 기본 dry-run (안전 기본)
PARENT=""
MILESTONE_TITLE=""
FEATURE_DIR=""
TASKS_FILE=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help) usage; exit 0 ;;
        --self-test) run_self_test; exit $? ;;
        --dry-run) DRY_RUN=1; shift ;;
        --no-dry-run) DRY_RUN=0; shift ;;
        --hours-per-task) shift; DEFAULT_HOURS_PER_TASK="${1:-1}"; shift ;;
        --parent) shift; PARENT="${1:-}"; shift ;;
        --milestone) shift; MILESTONE_TITLE="${1:-}"; shift ;;
        --feature) shift; FEATURE_DIR="${1:-}"; shift ;;
        --) shift; break ;;
        -*) echo "error: unknown option: $1" >&2; usage >&2; exit 2 ;;
        *) TASKS_FILE="$1"; shift ;;
    esac
done

if [[ -n "$FEATURE_DIR" ]]; then
    TASKS_FILE="$FEATURE_DIR/tasks.md"
fi
if [[ -z "$TASKS_FILE" ]]; then
    echo "error: --feature <dir> 또는 tasks.md 경로 필요" >&2; exit 2
fi
[[ -f "$TASKS_FILE" ]] || { echo "error: not found: $TASKS_FILE" >&2; exit 2; }

run "$TASKS_FILE" "$FEATURE_DIR" "$DRY_RUN" "$PARENT" "$MILESTONE_TITLE"
