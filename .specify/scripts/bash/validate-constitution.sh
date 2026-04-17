#!/usr/bin/env bash
# validate-constitution.sh
# 헌법 제V조(Cross-Domain Integrity) + 제VI조(RBAC) 위반 가능성을 spec.md에서
# 휴리스틱으로 스캔한다. 차단하지 않고 **경고**만 출력 (spec US8, FR-013).
#
# 제한:
#   - 정규식 기반 단순 휴리스틱. 오탐·부족 모두 가능.
#   - 판단 근거는 .specify/memory/constitution.md v1.2.0 Domain Ownership /
#     Prohibited Cross-Domain Access / Permission Matrix.
#   - 구현 검증은 담당하지 않음 (spec 단계에서 조기 경고 목적).

set -eo pipefail

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

WARNINGS=0
ADVICE_LINES=()

usage() {
    cat <<USAGE
Usage: $0 [--self-test] [--quiet] <spec.md>
       $0 [--self-test] [--quiet] --feature <feature-dir>

spec.md 본문에서 헌법 V·VI 위반 가능성을 휴리스틱 스캔하여 경고 출력.
차단하지 않으므로 CI에서도 exit 0.

Options:
  --feature <dir>   feature 디렉토리(내부 spec.md 사용)
  --self-test       내장 fixture 동작 확인
  --quiet           통과 시 요약 생략

Exit: 0 (경고 있어도) / 2 (사용법 오류)
USAGE
}

# 제V조 금지 패턴: "참조 도메인이 원천 엔티티를 {생성/수정/변경/삭제}"
# 본문 한 섹션(줄)에 동시 등장 시 경고.
# 엔티티는 대소문자 구분 없음. 도메인명은 한글 표기 우선.
scan_domain_violations() {
    local file="$1"
    # 패턴 형식: 파이프(|)로 구분된 조건. 각 조건은 정확 매칭(단일 키워드)이거나
    # 쉼표(,)로 구분된 OR 매칭 그룹. 한 줄에 모든 조건이 만족하면 위반 간주.
    local patterns=(
        # 동행 협업 × Activity × (수정/변경/생성/삭제)
        "동행 협업|Activity|수정,변경,생성,삭제"
        # 예산 관리 × Activity × (비용/cost) × (변경/수정)
        "예산 관리|Activity|비용,cost|변경,수정"
        # 일정 활용 × (Day,Activity) × (변경/수정/생성/삭제)
        "일정 활용|Day,Activity|변경,수정,생성,삭제"
        # 여행 탐색 × TripMember × (참조/조회)
        "여행 탐색|TripMember|참조,조회"
    )
    local descriptions=(
        "제V조 위반 의심: '동행 협업'이 'Activity'를 변경/생성/삭제 — 일정 편성 소유권 침범"
        "제V조 위반 의심: '예산 관리'가 'Activity cost'를 직접 변경 — 일정 편성 소유권 침범"
        "제V조 위반 의심: '일정 활용'이 'Day/Activity'를 변경 — 읽기 전용 원칙 침범"
        "제V조 위반 의심: '여행 탐색'이 'TripMember'를 참조 — 동행 협업 소유권 침범"
    )

    local lineno=0
    while IFS= read -r line; do
        lineno=$((lineno + 1))
        for i in "${!patterns[@]}"; do
            local pat="${patterns[$i]}"
            # 모든 키워드 그룹이 같은 줄에 나오는지 확인
            # pat = "A|B|C|D,E,F" — 간이로 |로 나눠 전부 매칭인지
            local ok=1
            IFS='|' read -r -a kws <<< "$pat"
            for kw in "${kws[@]}"; do
                if [[ "$kw" == *","* ]]; then
                    # 쉼표 그룹 — OR 매칭
                    local any_matched=0
                    IFS=',' read -r -a alts <<< "$kw"
                    for alt in "${alts[@]}"; do
                        if echo "$line" | grep -qF "$alt"; then
                            any_matched=1; break
                        fi
                    done
                    [[ "$any_matched" -eq 0 ]] && ok=0 && break
                else
                    # 단일 키워드
                    # (한글) "수정/변경" 같은 동사군 묶음을 | 대신 쉼표로 표기해 혼동 방지
                    # 여기서는 키워드 그대로 검사
                    if ! echo "$line" | grep -qE "$kw"; then
                        ok=0; break
                    fi
                fi
            done
            if [[ "$ok" -eq 1 ]]; then
                WARNINGS=$((WARNINGS + 1))
                ADVICE_LINES+=("${file}:${lineno}: ${descriptions[$i]}")
                ADVICE_LINES+=("    > ${line}")
            fi
        done
    done < "$file"
}

# 제VI조 RBAC 검증: FR/AS 본문에 등장하는 "행위"가 Permission Matrix에 있는지.
# Matrix 행위: 여행 조회, 일정/활동 편집, 멤버 초대, 멤버 제거, 호스트 승격, 호스트 강등, 여행 삭제, 주인 양도
# 현재 신규 행위를 감지하는 식으로 단순 휴리스틱: "게스트|GUEST.*(삭제|편집|초대|제거|승격|강등|양도)"
scan_rbac_violations() {
    local file="$1"
    local lineno=0
    while IFS= read -r line; do
        lineno=$((lineno + 1))
        # 게스트/HOST/OWNER가 매트릭스 외 행위를 수행한다는 표현
        if echo "$line" | grep -qE '게스트|GUEST' && \
           echo "$line" | grep -qE '삭제|편집|초대|제거|승격|강등|양도|변경' && \
           ! echo "$line" | grep -qE '조회|읽기|열람|view|read'; then
            WARNINGS=$((WARNINGS + 1))
            ADVICE_LINES+=("${file}:${lineno}: 제VI조 위반 의심: GUEST 역할이 매트릭스 외 행위를 수행하는 표현")
            ADVICE_LINES+=("    > ${line}")
        fi
    done < "$file"
}

scan_file() {
    local file="$1"
    scan_domain_violations "$file"
    scan_rbac_violations "$file"
}

# === Self-test ===
run_self_test() {
    local tmpdir
    tmpdir=$(mktemp -d)
    trap 'rm -rf "$tmpdir"' EXIT

    # Case A: 통과 (깨끗한 spec)
    cat > "$tmpdir/pass.md" <<'EOF'
# Spec

FR-001: 사용자는 여행을 조회할 수 있어야 한다.
FR-002: OWNER는 여행을 삭제할 수 있어야 한다.
EOF

    # Case B: 제V조 위반 (동행 협업이 Activity 변경)
    cat > "$tmpdir/v5-violation.md" <<'EOF'
FR-010: 동행 협업 모듈이 Activity를 직접 생성할 수 있어야 한다.
EOF

    # Case C: 제VI조 위반 (GUEST가 편집)
    cat > "$tmpdir/v6-violation.md" <<'EOF'
FR-020: GUEST가 일정을 편집할 수 있어야 한다.
EOF

    local ok=1

    echo "=== Case A: 깨끗한 spec ==="
    WARNINGS=0; ADVICE_LINES=()
    scan_file "$tmpdir/pass.md"
    [[ "$WARNINGS" -eq 0 ]] && echo "PASS (warnings=0)" || { echo "FAIL: got $WARNINGS" >&2; ok=0; printf '%s\n' "${ADVICE_LINES[@]}" >&2; }

    echo "=== Case B: 제V조 위반 ==="
    WARNINGS=0; ADVICE_LINES=()
    scan_file "$tmpdir/v5-violation.md"
    [[ "$WARNINGS" -ge 1 ]] && echo "PASS (warnings=$WARNINGS)" || { echo "FAIL: expected >=1 got $WARNINGS" >&2; ok=0; }

    echo "=== Case C: 제VI조 위반 ==="
    WARNINGS=0; ADVICE_LINES=()
    scan_file "$tmpdir/v6-violation.md"
    [[ "$WARNINGS" -ge 1 ]] && echo "PASS (warnings=$WARNINGS)" || { echo "FAIL: expected >=1 got $WARNINGS" >&2; ok=0; }

    [[ "$ok" -eq 1 ]] && return 0 || return 1
}

# === Main ===
QUIET=0
FEATURE_DIR=""
SPEC_FILE=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help) usage; exit 0 ;;
        --self-test) run_self_test; exit $? ;;
        --feature) shift; FEATURE_DIR="${1:-}"; shift ;;
        --quiet) QUIET=1; shift ;;
        --) shift; break ;;
        -*) echo "error: unknown option: $1" >&2; usage >&2; exit 2 ;;
        *) SPEC_FILE="$1"; shift ;;
    esac
done

if [[ -n "$FEATURE_DIR" ]]; then
    SPEC_FILE="$FEATURE_DIR/spec.md"
fi
if [[ -z "$SPEC_FILE" ]]; then
    echo "error: spec.md 경로 필요" >&2; exit 2
fi
[[ -f "$SPEC_FILE" ]] || { echo "error: not found: $SPEC_FILE" >&2; exit 2; }

scan_file "$SPEC_FILE"

if [[ "$WARNINGS" -eq 0 ]]; then
    [[ "$QUIET" -eq 0 ]] && echo "✓ constitution 휴리스틱 스캔 통과 (경고 0건)"
    exit 0
fi

echo "=== 헌법 V·VI 경고 (차단 아님) ===" >&2
for a in "${ADVICE_LINES[@]}"; do echo "$a" >&2; done
echo "" >&2
echo "⚠ constitution 경고: ${WARNINGS}건 (검토 후 무해하면 무시 가능)" >&2
exit 0
