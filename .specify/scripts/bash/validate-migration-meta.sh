#!/usr/bin/env bash
# validate-migration-meta.sh
# expand-and-contract 규칙 검증 (spec 010 US4, FR-006/007):
#   A) plan.md에 스키마/enum 변경 bullet이 있으면, tasks.md에 대응 "데이터 보정"
#      태스크가 존재해야 한다 (같은 [why] + [migration-type: data-migration] 또는
#      [why]가 "-backfill"로 끝남 또는 설명에 "보정"/"backfill" 포함).
#   B) prisma/migrations/*/migration.sql 각 파일은 상단에 SQL 주석
#      "-- [migration-type: schema-only|data-migration]" 헤더를 두어야 한다.
#
# phase-aware(spec FR-015, harness.json .rollout.phase):
#   expand/migrate → 경고(exit 0)
#   contract       → 차단(exit 1)

set -eo pipefail

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

VIOLATIONS=0
WARNINGS=0
PHASE=$(harness_config_get '.rollout.phase' 'expand')
MIGRATION_TYPES_CSV=$(harness_config_get '.metatag.migrationTypes | join(",")' "schema-only,data-migration")

usage() {
    cat <<USAGE
Usage: $0 [--self-test] [--quiet] --feature <feature-dir>
       $0 [--self-test] [--quiet] --all-migrations [root]
       $0 [--self-test] [--quiet] <plan.md> <tasks.md>

Options:
  --feature <dir>     피처 디렉토리(내부 plan.md + tasks.md 사용, 마이그레이션
                      디렉토리도 자동 스캔)
  --all-migrations    레포 전체 prisma/migrations/ 아래 헤더 검증
  --self-test         내장 fixture 동작 확인
  --quiet             통과 시 요약 생략
  -h, --help          도움말

Exit: 0(통과/경고) / 1(차단 — phase=contract) / 2(사용법 오류)
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
                out="${out}${line%%<!--*}"
                line="${line#*<!--}"
                IN_COMMENT=1
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

extract_tag_value() {
    local line="$1" key="$2" vals=""
    while [[ "$line" == *"[$key:"* ]]; do
        line="${line#*[$key:}"
        local content="${line%%]*}"
        line="${line#*]}"
        local v="${content#"${content%%[![:space:]]*}"}"
        v="${v%"${v##*[![:space:]]}"}"
        [[ -n "$v" ]] && vals="$vals"$'\n'"$v"
    done
    printf '%s' "${vals#$'\n'}"
}

# 태그 전부 제거하고 순수 텍스트만 반환
strip_all_tags() {
    local line="$1"
    local out=""
    while [[ "$line" == *"["* ]]; do
        out="${out}${line%%[*}"
        line="${line#*[}"
        if [[ "$line" != *"]"* ]]; then out="${out}${line}"; line=""; else line="${line#*]}"; fi
    done
    printf '%s' "${out}${line}"
}

# 스키마/enum 키워드 포함 bullet 감지
# 입력: 태그 제거된 텍스트
# 반환: 0 = 포함, 1 = 미포함
contains_schema_keyword() {
    local text="$1"
    if echo "$text" | grep -qiE '[^-]enum|^enum|\benum\b|스키마|컬럼'; then
        return 0
    fi
    return 1
}

# plan.md 스캔 → 스키마 bullet의 (why, 줄번호) 목록 stdout
scan_plan_schema_bullets() {
    local file="$1"
    IN_COMMENT=0
    local in_fence=0 fence_len=0 lineno=0
    while IFS= read -r rawline; do
        lineno=$((lineno + 1))
        if [[ "$rawline" =~ ^[[:space:]]*(\`\`\`+) ]]; then
            local L=${#BASH_REMATCH[1]}
            if [[ "$in_fence" -eq 0 ]]; then in_fence=1; fence_len=$L
            elif [[ "$L" -ge "$fence_len" ]]; then in_fence=0; fence_len=0; fi
            continue
        fi
        [[ "$in_fence" -eq 1 ]] && continue

        CLEANED_LINE=""
        strip_html_comment "$rawline"
        [[ "$CLEANED_LINE" =~ ^(-[[:space:]]+|\*[[:space:]]+|[0-9]+\.[[:space:]]+) ]] || continue
        strip_inline_code

        local prose
        prose=$(strip_all_tags "$CLEANED_LINE")
        contains_schema_keyword "$prose" || continue

        local whys
        whys=$(extract_tag_value "$CLEANED_LINE" "why")
        while IFS= read -r w; do
            [[ -z "$w" ]] && continue
            printf '%s|%d\n' "$w" "$lineno"
        done <<< "$whys"
    done < "$file"
}

# tasks.md 스캔 → 각 태스크의 (why, migration-type-or-empty, description)
scan_tasks() {
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
        [[ "$CLEANED_LINE" =~ ^[[:space:]]*-[[:space:]]+\[[[:space:]xX]\][[:space:]] ]] || continue
        strip_inline_code

        local why mtype desc
        why=$(extract_tag_value "$CLEANED_LINE" "why" | head -1)
        mtype=$(extract_tag_value "$CLEANED_LINE" "migration-type" | head -1)
        desc=$(strip_all_tags "$CLEANED_LINE")
        # CSV 변환 (| 구분자 사용, desc 내부의 |는 공백으로 대체)
        desc="${desc//|/ }"
        printf '%s|%s|%s\n' "${why:-}" "${mtype:-}" "$desc"
    done < "$file"
}

# Part A: plan 스키마 bullet → tasks 매핑 검증
validate_plan_tasks_mapping() {
    local plan="$1" tasks="$2"
    [[ -f "$plan" ]] || return 0
    [[ -f "$tasks" ]] || return 0

    local plan_entries tasks_rows
    plan_entries=$(scan_plan_schema_bullets "$plan")
    [[ -z "$plan_entries" ]] && return 0

    tasks_rows=$(scan_tasks "$tasks")

    while IFS='|' read -r plan_why plan_line; do
        [[ -z "$plan_why" ]] && continue
        local found=0
        if [[ -n "$tasks_rows" ]]; then
            while IFS='|' read -r t_why t_mtype t_desc; do
                # 매칭 범위: 정확히 같거나, plan_why에 "-backfill" 접미사가 붙은 why
                local matches=0
                if [[ "$t_why" == "$plan_why" ]]; then matches=1
                elif [[ "$t_why" == "${plan_why}-backfill" ]]; then matches=1
                fi
                [[ "$matches" -eq 0 ]] && continue

                # 유효 backfill 태스크 조건
                if [[ "$t_mtype" == "data-migration" ]] \
                   || [[ "$t_why" == *-backfill ]] \
                   || echo "$t_desc" | grep -qiE '보정|backfill'; then
                    found=1; break
                fi
            done <<< "$tasks_rows"
        fi
        if [[ "$found" -eq 0 ]]; then
            VIOLATIONS=$((VIOLATIONS + 1))
            printf '%s:%d: schema/enum bullet [why: %s]에 대응 data-migration/보정 태스크 없음\n' \
                "$plan" "$plan_line" "$plan_why" >&2
        fi
    done <<< "$plan_entries"
}

# Part B: 마이그레이션 SQL 헤더 검증
validate_migration_headers() {
    local root="$1"
    local migrations_dir="$root/prisma/migrations"
    [[ -d "$migrations_dir" ]] || return 0

    while IFS= read -r sql; do
        [[ -z "$sql" ]] && continue
        local first10
        first10=$(head -10 "$sql" 2>/dev/null || echo "")
        if ! echo "$first10" | grep -qE '^--[[:space:]]*\[migration-type:[[:space:]]+(schema-only|data-migration)\]'; then
            # harness_config에서 허용값 확인
            WARNINGS=$((WARNINGS + 1))
            printf '⚠ %s: migration.sql 상단 `-- [migration-type: %s]` 헤더 없음\n' \
                "${sql#"$root"/}" "$MIGRATION_TYPES_CSV" >&2
        fi
    done < <(find "$migrations_dir" -type f -name "migration.sql" 2>/dev/null | sort)
}

# === Self-test ===
run_self_test() {
    local tmpdir
    tmpdir=$(mktemp -d)
    trap 'rm -rf "$tmpdir"' EXIT

    # Case A: plan에 enum bullet + tasks에 backfill 태스크 → PASS
    cat > "$tmpdir/plan-pass.md" <<'EOF'
- OWNER enum 값 추가 [why: owner-role]
EOF
    cat > "$tmpdir/tasks-pass.md" <<'EOF'
- [ ] T1 스키마만 [artifact: prisma/migrations/x/migration.sql] [why: owner-role] [migration-type: schema-only]
- [ ] T2 HOST→OWNER 보정 [artifact: prisma/migrations/y/migration.sql] [why: owner-role] [migration-type: data-migration]
EOF

    # Case B: plan에 enum bullet + tasks에 schema-only만 → FAIL
    cat > "$tmpdir/plan-fail.md" <<'EOF'
- OWNER enum 값 추가 [why: owner-role]
EOF
    cat > "$tmpdir/tasks-fail.md" <<'EOF'
- [ ] T1 스키마만 [artifact: prisma/migrations/x/migration.sql] [why: owner-role] [migration-type: schema-only]
EOF

    # Case C: backfill suffix에 의한 매칭 → PASS
    cat > "$tmpdir/plan-suffix.md" <<'EOF'
- 컬럼 추가 [why: trip-col]
EOF
    cat > "$tmpdir/tasks-suffix.md" <<'EOF'
- [ ] T1 스키마 [artifact: x] [why: trip-col]
- [ ] T2 백필 [artifact: y] [why: trip-col-backfill]
EOF

    local ok=1 v

    echo "=== Case A: plan enum + data-migration 태스크 ==="
    VIOLATIONS=0
    validate_plan_tasks_mapping "$tmpdir/plan-pass.md" "$tmpdir/tasks-pass.md"
    v=$VIOLATIONS; [[ "$v" -eq 0 ]] && echo "PASS (violations=0)" || { echo "FAIL expected 0 got $v" >&2; ok=0; }

    echo "=== Case B: plan enum + backfill 누락 ==="
    VIOLATIONS=0
    validate_plan_tasks_mapping "$tmpdir/plan-fail.md" "$tmpdir/tasks-fail.md"
    v=$VIOLATIONS; [[ "$v" -eq 1 ]] && echo "PASS (violations=1 expected)" || { echo "FAIL expected 1 got $v" >&2; ok=0; }

    echo "=== Case C: -backfill 접미사 매칭 ==="
    VIOLATIONS=0
    validate_plan_tasks_mapping "$tmpdir/plan-suffix.md" "$tmpdir/tasks-suffix.md"
    v=$VIOLATIONS; [[ "$v" -eq 0 ]] && echo "PASS (violations=0)" || { echo "FAIL expected 0 got $v" >&2; ok=0; }

    # Case D: 마이그레이션 헤더
    mkdir -p "$tmpdir/prisma/migrations/001_pass"
    mkdir -p "$tmpdir/prisma/migrations/002_fail"
    cat > "$tmpdir/prisma/migrations/001_pass/migration.sql" <<'EOF'
-- [migration-type: schema-only]
ALTER TABLE x ADD COLUMN y int;
EOF
    cat > "$tmpdir/prisma/migrations/002_fail/migration.sql" <<'EOF'
-- some comment
ALTER TABLE x ADD COLUMN z int;
EOF
    echo "=== Case D: migration 헤더 스캔 ==="
    WARNINGS=0
    validate_migration_headers "$tmpdir"
    [[ "$WARNINGS" -eq 1 ]] && echo "PASS (warnings=1 for 002_fail)" || { echo "FAIL expected 1 got $WARNINGS" >&2; ok=0; }

    [[ "$ok" -eq 1 ]] && return 0 || return 1
}

# === Main ===
QUIET=0
FEATURE_DIR=""
ALL_MIGRATIONS=0
ROOT_DIR=""
PLAN_FILE=""; TASKS_FILE=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help) usage; exit 0 ;;
        --self-test) run_self_test; exit $? ;;
        --quiet) QUIET=1; shift ;;
        --feature) shift; FEATURE_DIR="${1:-}"; shift ;;
        --all-migrations) ALL_MIGRATIONS=1; shift
            [[ "${1:-}" && ! "$1" == --* ]] && { ROOT_DIR="$1"; shift; } || true ;;
        --) shift; break ;;
        -*) echo "error: unknown option: $1" >&2; usage >&2; exit 2 ;;
        *)
            if [[ -z "$PLAN_FILE" ]]; then PLAN_FILE="$1"
            elif [[ -z "$TASKS_FILE" ]]; then TASKS_FILE="$1"
            else echo "error: too many args" >&2; exit 2; fi
            shift ;;
    esac
done

repo_root=$(get_repo_root)
[[ -z "$ROOT_DIR" ]] && ROOT_DIR="$repo_root"

if [[ -n "$FEATURE_DIR" ]]; then
    validate_plan_tasks_mapping "$FEATURE_DIR/plan.md" "$FEATURE_DIR/tasks.md"
    validate_migration_headers "$ROOT_DIR"
elif [[ "$ALL_MIGRATIONS" -eq 1 ]]; then
    validate_migration_headers "$ROOT_DIR"
elif [[ -n "$PLAN_FILE" && -n "$TASKS_FILE" ]]; then
    validate_plan_tasks_mapping "$PLAN_FILE" "$TASKS_FILE"
else
    echo "error: need --feature <dir> or --all-migrations or <plan.md> <tasks.md>" >&2
    usage >&2; exit 2
fi

if [[ "$VIOLATIONS" -eq 0 ]] && [[ "$WARNINGS" -eq 0 ]]; then
    [[ "$QUIET" -eq 0 ]] && echo "✓ migration-meta 검증 통과"
    exit 0
fi

if [[ "$VIOLATIONS" -gt 0 ]]; then
    if [[ "$PHASE" == "contract" ]]; then
        echo "✗ migration-meta 위반: ${VIOLATIONS}건 (phase=contract, 차단). warnings=${WARNINGS}" >&2
        exit 1
    fi
    echo "⚠ migration-meta 위반: ${VIOLATIONS}건 (phase=${PHASE}, 비차단). warnings=${WARNINGS}" >&2
    exit 0
fi
echo "⚠ migration-meta 경고: warnings=${WARNINGS} (phase=${PHASE})" >&2
exit 0
