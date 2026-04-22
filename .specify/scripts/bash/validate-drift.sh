#!/usr/bin/env bash
# validate-drift.sh
# tasks.md의 [artifact: ...] 선언과 레포 실제 파일 존재 일치성을 교차 검증.
#
# 판정 기준 (harness.json의 driftAudit.severity 오버라이드 가능):
#   - 체크됨 [x] + artifact 없음 → error
#   - 미체크 [ ] + artifact 존재 → warning (drift 알림)
#   - 체크됨 + 존재 / 미체크 + 없음 → 통과
#
# 사용:
#   validate-drift.sh <tasks.md>                      # 단일 파일
#   validate-drift.sh --feature <feature-dir>         # 피처 1개
#   validate-drift.sh --audit                         # 활성 피처 전체 순회,
#                                                      # docs/audits/drift/YYYY-MM-DD.md 생성
#
# 설계: spec 010 FR-003/004, plan 섹션 "CI Integration". PR #204.

set -eo pipefail

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

ERRORS=0
WARNINGS=0
ERROR_LINES=()
WARNING_LINES=()

usage() {
    cat <<USAGE
Usage: $0 [options] <tasks.md>
       $0 [options] --feature <feature-dir>
       $0 --audit [--out <report-path>]

Options:
  --feature <dir>   피처 디렉토리 (내부 tasks.md 자동 인식)
  --audit           활성 피처 전체 순회 + docs/audits/drift/YYYY-MM-DD.md 저장
  --out <path>      --audit 리포트 저장 경로 오버라이드
  --quiet           통과 시 요약 생략
  --self-test       내장 fixture 동작 확인
  -h, --help        도움말

Exit:
  0 — error 0건
  1 — error ≥1건 (warning만 있어도 0)
  2 — 사용법 오류
USAGE
}

strip_html_comment() {
    local line="$1"
    local out=""
    while [[ -n "$line" ]]; do
        if [[ "$IN_COMMENT" -eq 1 ]]; then
            if [[ "$line" == *"-->"* ]]; then
                line="${line#*-->}"; IN_COMMENT=0
            else
                line=""
            fi
        else
            if [[ "$line" == *"<!--"* ]]; then
                out="${out}${line%%<!--*}"
                line="${line#*<!--}"
                IN_COMMENT=1
            else
                out="${out}${line}"; line=""
            fi
        fi
    done
    CLEANED_LINE="$out"
}

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

extract_tag_values() {
    local line="$1" key="$2"
    local vals=""
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

# artifact 값에서 파일 경로 추출 ("path::symbol" → "path")
# Next.js 동적 라우트 세그먼트는 metatag bracket 규칙과 충돌하므로 `<name>` placeholder로
# 쓰고(예: src/app/api/trips/<id>/...), 여기서 실제 경로 `[name]`으로 변환해 파일 존재를 확인한다.
artifact_path() {
    local v="$1"
    local path="${v%%::*}"
    path=$(printf '%s' "$path" | sed -E 's/<([.A-Za-z_][.A-Za-z0-9_-]*)>/[\1]/g')
    printf '%s' "$path"
}

# 한 tasks.md 검사. 전역 ERRORS/WARNINGS/*_LINES 누적.
scan_tasks_file() {
    local file="$1"
    local feature_label="$2"   # 리포트용 라벨 (예: "010-speckit-harness")
    local repo_root="$3"

    IN_COMMENT=0
    local in_fence=0 fence_len=0 lineno=0

    while IFS= read -r rawline; do
        lineno=$((lineno + 1))

        if [[ "$rawline" =~ ^[[:space:]]*(\`\`\`+) ]]; then
            local this_len=${#BASH_REMATCH[1]}
            if [[ "$in_fence" -eq 0 ]]; then in_fence=1; fence_len=$this_len
            elif [[ "$this_len" -ge "$fence_len" ]]; then in_fence=0; fence_len=0
            fi
            continue
        fi
        [[ "$in_fence" -eq 1 ]] && continue

        CLEANED_LINE=""
        strip_html_comment "$rawline"

        # 체크박스 라인만 (들여쓰기 허용)
        if [[ ! "$CLEANED_LINE" =~ ^[[:space:]]*-[[:space:]]+\[([[:space:]xX])\][[:space:]] ]]; then
            continue
        fi
        local mark="${BASH_REMATCH[1]}"
        local checked=0
        [[ "$mark" == "x" || "$mark" == "X" ]] && checked=1

        strip_inline_code

        local artifact_vals
        artifact_vals=$(extract_tag_values "$CLEANED_LINE" "artifact")
        [[ -z "$artifact_vals" ]] && continue

        while IFS= read -r art; do
            [[ -z "$art" ]] && continue
            local path
            path=$(artifact_path "$art")
            # artifact 값은 `<path>|<path>` 형식으로 복수 경로를 허용한다(한 태스크가
            # 여러 파일을 편집한 경우). AND 해석 — 모두 존재해야 통과.
            local all_exist=1
            local IFS_BAK="$IFS"; IFS='|'
            read -ra _path_parts <<< "$path"
            IFS="$IFS_BAK"
            local p
            for p in "${_path_parts[@]}"; do
                [[ -z "$p" ]] && continue
                local fullpath="$repo_root/$p"
                if [[ ! -e "$fullpath" ]]; then
                    all_exist=0
                    break
                fi
            done

            if [[ "$all_exist" -eq 1 ]]; then
                if [[ "$checked" -eq 0 ]]; then
                    WARNINGS=$((WARNINGS + 1))
                    WARNING_LINES+=("${feature_label}/tasks.md:${lineno} — 미체크인데 아티팩트 존재: \`${path}\`")
                fi
            else
                if [[ "$checked" -eq 1 ]]; then
                    ERRORS=$((ERRORS + 1))
                    ERROR_LINES+=("${feature_label}/tasks.md:${lineno} — 체크됐으나 아티팩트 부재: \`${path}\`")
                fi
            fi
        done <<< "$artifact_vals"
    done < "$file"
}

# audit 모드: 활성 피처 전체 순회
run_audit() {
    local out_path="$1"
    local repo_root
    repo_root=$(get_repo_root)

    local report_dir
    report_dir=$(harness_config_get '.driftAudit.reportDir' 'docs/audits/drift')
    if [[ -z "$out_path" ]]; then
        local today
        today=$(date +%Y-%m-%d)
        out_path="$repo_root/$report_dir/${today}.md"
    fi
    mkdir -p "$(dirname "$out_path")"

    local features
    features=$(feature_dirs)

    # 헤더
    local header="# Drift Audit — $(date +%Y-%m-%d)

생성 시각: $(date -u +%Y-%m-%dT%H:%M:%SZ) (UTC)
리포트 범위: 활성 피처 순회 (.specify/config/harness.json .categoryDirs 기준)

"
    local summary="" body=""

    while IFS= read -r feature_dir; do
        [[ -z "$feature_dir" ]] && continue
        local feature_label="${feature_dir#"$repo_root"/}"
        feature_label="${feature_label#specs/}"
        local tasks_file="$feature_dir/tasks.md"

        # 피처별 ERRORS/WARNINGS 시작점
        local prev_errors=$ERRORS prev_warnings=$WARNINGS

        if [[ ! -f "$tasks_file" ]]; then
            body+="## ${feature_label}

- tasks.md 없음 — 스킵

"
            continue
        fi

        scan_tasks_file "$tasks_file" "$feature_label" "$repo_root"

        local added_err=$((ERRORS - prev_errors))
        local added_warn=$((WARNINGS - prev_warnings))

        body+="## ${feature_label}

- errors: ${added_err}
- warnings: ${added_warn}
"
        if [[ "$added_err" -gt 0 ]] || [[ "$added_warn" -gt 0 ]]; then
            body+="
### Details

"
            if [[ "$added_err" -gt 0 ]]; then
                body+="#### Errors

"
                local i=$((${#ERROR_LINES[@]} - added_err))
                while [[ $i -lt ${#ERROR_LINES[@]} ]]; do
                    body+="- ${ERROR_LINES[$i]}
"
                    i=$((i + 1))
                done
                body+="
"
            fi
            if [[ "$added_warn" -gt 0 ]]; then
                body+="#### Warnings

"
                local i=$((${#WARNING_LINES[@]} - added_warn))
                while [[ $i -lt ${#WARNING_LINES[@]} ]]; do
                    body+="- ${WARNING_LINES[$i]}
"
                    i=$((i + 1))
                done
                body+="
"
            fi
        fi
    done <<< "$features"

    summary="## Summary

- total errors: ${ERRORS}
- total warnings: ${WARNINGS}

"

    printf '%s%s%s' "$header" "$summary" "$body" > "$out_path"
    echo "drift audit report: $out_path"
    echo "  errors=${ERRORS} warnings=${WARNINGS}"
}

# === Self-test ===
run_self_test() {
    local tmpdir
    tmpdir=$(mktemp -d)
    trap 'rm -rf "$tmpdir"' EXIT

    # 레포 레이아웃 모사
    mkdir -p "$tmpdir/specs/_infra/999-test"
    mkdir -p "$tmpdir/existing/dir"
    touch "$tmpdir/existing/file.ts"
    touch "$tmpdir/specs/_infra/999-test/plan.md"

    local tasks="$tmpdir/specs/_infra/999-test/tasks.md"
    cat > "$tasks" <<'EOF'
## Test cases

- [x] T1 체크+존재 [artifact: existing/file.ts] [why: ok]
- [x] T2 체크+부재 [artifact: missing/nope.ts] [why: err]
- [ ] T3 미체크+존재 [artifact: existing/file.ts] [why: warn]
- [ ] T4 미체크+부재 [artifact: also/missing.ts] [why: ok]
- [x] T5 심볼 형태 [artifact: existing/file.ts::someSym] [why: ok]
EOF

    echo "=== Self-test: single file ==="
    ERRORS=0; WARNINGS=0
    ERROR_LINES=(); WARNING_LINES=()
    scan_tasks_file "$tasks" "_infra/999-test" "$tmpdir"

    local ok=1
    if [[ "$ERRORS" -eq 1 ]]; then
        echo "PASS: errors=1 (T2 체크+부재)"
    else
        echo "FAIL: expected 1 error, got $ERRORS" >&2
        ok=0
    fi
    if [[ "$WARNINGS" -eq 1 ]]; then
        echo "PASS: warnings=1 (T3 미체크+존재)"
    else
        echo "FAIL: expected 1 warning, got $WARNINGS" >&2
        ok=0
    fi

    [[ "$ok" -eq 1 ]] && return 0 || return 1
}

# === Main ===
QUIET=0
MODE=""
FEATURE_DIR=""
TASKS_FILE=""
OUT_PATH=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help) usage; exit 0 ;;
        --self-test) run_self_test; exit $? ;;
        --audit) MODE="audit"; shift ;;
        --feature)
            shift; FEATURE_DIR="${1:-}"
            [[ -z "$FEATURE_DIR" ]] && { echo "error: --feature requires dir" >&2; exit 2; }
            shift ;;
        --out) shift; OUT_PATH="${1:-}"; shift ;;
        --quiet) QUIET=1; shift ;;
        --) shift; break ;;
        -*) echo "error: unknown option: $1" >&2; usage >&2; exit 2 ;;
        *)
            if [[ -z "$TASKS_FILE" ]]; then TASKS_FILE="$1"
            else echo "error: too many args" >&2; exit 2
            fi
            shift ;;
    esac
done

if [[ "$MODE" == "audit" ]]; then
    run_audit "$OUT_PATH"
    [[ "$ERRORS" -gt 0 ]] && exit 1 || exit 0
fi

if [[ -n "$FEATURE_DIR" ]]; then
    TASKS_FILE="$FEATURE_DIR/tasks.md"
fi
if [[ -z "$TASKS_FILE" ]]; then
    echo "error: tasks.md 경로 필요(또는 --feature, --audit)" >&2
    usage >&2; exit 2
fi
if [[ ! -f "$TASKS_FILE" ]]; then
    echo "error: not found: $TASKS_FILE" >&2; exit 2
fi

repo_root=$(get_repo_root)
feature_label="${TASKS_FILE#"$repo_root"/}"
feature_label="${feature_label#specs/}"
feature_label="${feature_label%/tasks.md}"

scan_tasks_file "$TASKS_FILE" "$feature_label" "$repo_root"

# 리포트 출력
if [[ "$ERRORS" -gt 0 || "$WARNINGS" -gt 0 ]]; then
    if [[ "$ERRORS" -gt 0 ]]; then
        echo "=== Errors ===" >&2
        for l in "${ERROR_LINES[@]}"; do echo "- $l" >&2; done
    fi
    if [[ "$WARNINGS" -gt 0 ]]; then
        echo "=== Warnings ===" >&2
        for l in "${WARNING_LINES[@]}"; do echo "- $l" >&2; done
    fi
fi

if [[ "$ERRORS" -gt 0 ]]; then
    echo "✗ drift errors=${ERRORS} warnings=${WARNINGS}" >&2
    exit 1
fi
[[ "$QUIET" -eq 0 ]] && echo "✓ drift 검증 통과 (errors=0 warnings=${WARNINGS})"
exit 0
