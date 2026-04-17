# Implementation Plan: speckit 하네스 강제 + 커스텀 + drift 방지

**Branch**: `010-speckit-harness` | **Date**: 2026-04-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/_infra/010-speckit-harness/spec.md`

## Summary

17개 FR을 7개 영역의 검증기·템플릿·훅·CI로 구현한다. 기존 `.specify/scripts/bash/enforce-speckit.sh`와 템플릿을 확장하고, 검증 규약의 근간을 네 개 메타태그(`[artifact]`, `[why]`, `[multi-step]`, `[migration-type]`)로 고정한다. 기존 활성 피처(004·006·009 등)에 메타태그를 역적용한 뒤 블로킹 모드로 전환하는 3단계(expand → migrate → contract) 롤아웃으로 도입한다.

## Coverage Targets

`validate-plan-tasks-cov.sh`가 이 목록의 각 `[why]` 태그별 최소 태스크 수를 `tasks.md`에서 검증한다. 추적 대상 bullet만 기재한다(Summary 설명 등 정보성 bullet은 제외).

- 설정 스카폴드 [why: config-scaffold] [multi-step: 3]
- 메타태그 파서 + 회귀 케이스 [why: metatag-parser] [multi-step: 3]
- plan ↔ tasks 커버리지 검증 [why: plan-tasks-coverage] [multi-step: 5]
- tasks ↔ artifact drift 감사 [why: drift-audit] [multi-step: 5]
- quickstart 실행 증명 게이트 [why: quickstart-evidence] [multi-step: 5]
- expand-and-contract 데이터 보정 강제 [why: expand-contract-schema] [multi-step: 5]
- 파이프라인 순서 강제 + 카테고리 탐색 버그 수정 [why: order-enforcement] [multi-step: 4]
- implement 커스텀 템플릿 [why: implement-template] [multi-step: 3]
- tasks → 이슈 합산 + 마일스톤 자동화 [why: tasks-to-issues] [multi-step: 4]
- 헌법 V·VI 휴리스틱 스캐너 [why: constitution-scanner] [multi-step: 3]
- 롤아웃 마이그레이션(Phase B·C 전환) [why: rollout-migration] [multi-step: 4]
- 문서 동기화(CLAUDE.md + CHANGELOG) [why: docs-update] [multi-step: 2]

## Technical Context

**Language/Version**: Bash 3.2+ (macOS 기본), jq, grep/sed (POSIX)
**Primary Dependencies**: 기존 `.specify/scripts/bash/common.sh`, `gh` CLI, GitHub Actions(스케줄 실행)
**Storage**: 파일(`docs/audits/drift/YYYY-MM-DD.md`, `.specify/config/harness.json`), Git history(검증 결과 아님, 리포트만)
**Testing**: Bats(Bash 테스트) 도입 없이 `scripts/` 하위 재현 스크립트로 검증. 수동 회귀 케이스 목록을 `quickstart.md`에 정의
**Target Platform**: 개발자 로컬(macOS), 원격 CI(GitHub Actions). Linux/Windows 호환성은 best-effort
**Project Type**: CI/CD + 로컬 훅 + 템플릿 (도구 확장)
**Constraints**: 기존 `-maxdepth 1` 기반 `enforce-speckit.sh` 버그 수정 필수(카테고리 하위 구조 탐색 불가). 훅은 2s 이내 종료해야 Edit/Write 체감 지연이 없다

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AX-First | N/A | 개발자 도구. 사용자 AI 경험과 무관 |
| II. Minimum Cost | PASS | GitHub Actions 무료 스케줄(월 1회 수준), 외부 서비스 미도입 |
| III. Mobile-First | N/A | 개발자 로컬·CI 동작 |
| IV. Incremental Release | PASS | expand→migrate→contract 3단계 롤아웃으로 기존 피처 영향 최소화 |
| V. Cross-Domain Integrity | PASS | 본 하네스는 모든 도메인 공용 인프라. 도메인 경계 영향 없음 |
| VI. RBAC | N/A | 로컬 도구 + CI, 권한 매트릭스 영향 없음 |

## Architecture

### 레이어 구성

```
┌─ Template layer (.specify/templates/) ─────────────────────────────┐
│  spec-template.md     — 메타태그 사용법 가이드 섹션 추가          │
│  plan-template.md     — [multi-step] 사용 가이드                  │
│  tasks-template.md    — [artifact]/[why] 필수 기재 형식           │
│  quickstart-template.md (NEW) — ### Evidence 서브섹션 규정        │
│  implement-template.md  (NEW) — DDD 레이어·테스트·커밋 가이드     │
└────────────────────────────────────────────────────────────────────┘

┌─ Validator layer (.specify/scripts/bash/) ─────────────────────────┐
│  validate-metatag-format.sh   — 네 태그 형식 린트(공통)            │
│  validate-plan-tasks-cov.sh   — FR-001, FR-002                    │
│  validate-drift.sh            — FR-003                            │
│  validate-quickstart-ev.sh    — FR-005                            │
│  validate-migration-meta.sh   — FR-006, FR-007                    │
│  validate-constitution.sh     — FR-013 (휴리스틱 스캐너)           │
│  merge-tasks-to-issues.sh     — FR-011, FR-012                    │
│  enforce-speckit.sh           — MODIFY: 재귀 탐색 + 순서 강제     │
└────────────────────────────────────────────────────────────────────┘

┌─ Hook/Integration layer ───────────────────────────────────────────┐
│  PreToolUse(Edit|Write) → enforce-speckit.sh                      │
│  pre-commit (optional)  → validate-metatag-format.sh              │
│  PR merge gate(GH App or Action) → validate-quickstart-ev.sh +    │
│                                     validate-drift.sh             │
│  Scheduled(cron)        → validate-drift.sh (audit mode)          │
└────────────────────────────────────────────────────────────────────┘

┌─ Config layer ─────────────────────────────────────────────────────┐
│  .specify/config/harness.json (NEW)                               │
│    - driftAudit: { cron, reportDir, severityMap }                 │
│    - metatag: { enabled, blockingMode }                           │
│    - rollout: { phase: "expand"|"migrate"|"contract" }            │
└────────────────────────────────────────────────────────────────────┘
```

### 메타태그 파서 공통 규약

- 파싱은 **줄 단위 정규식**만 사용한다. 복수 태그는 한 줄에 연속 배치 허용.
- 태그 위치: 해당 bullet/태스크 라인의 **끝**에 배치. 별도 속성 블록을 두지 않는다.
- 검증기는 태그 **존재**만 확인하고, 값의 의미적 검증은 하지 않는다(FR-017).
- 예시:
  ```
  - [ ] T042 권한 매트릭스 HOST→OWNER 데이터 보정 [artifact: prisma/migrations/20260418_owner_backfill/migration.sql] [why: owner-role-backfill] [migration-type: data-migration]
  ```

## Script Inventory

| 스크립트 | 신규/수정 | 입력 | 출력 | 차단 조건 |
|----------|-----------|------|------|-----------|
| `validate-metatag-format.sh` | NEW | 피처 디렉토리 | 형식 위반 목록 | 괄호 unmatched, 허용 외 값 |
| `validate-plan-tasks-cov.sh` | NEW | `plan.md`, `tasks.md` | 미매핑 bullet 목록 | 매핑 공집합 또는 multi-step 부족 |
| `validate-drift.sh` | NEW | `tasks.md` + 레포 트리 | drift 리포트(md) | 체크됐으나 artifact 부재 시 에러 |
| `validate-quickstart-ev.sh` | NEW | `quickstart.md` | 증거 누락 시나리오 | Evidence 서브섹션 부재 |
| `validate-migration-meta.sh` | NEW | `plan.md`, 마이그레이션 디렉토리 | 메타데이터 누락 목록 | `[migration-type]` 미기재 |
| `validate-constitution.sh` | NEW | `spec.md` | 원칙 위반 경고 | 경고만, 차단 없음 |
| `merge-tasks-to-issues.sh` | NEW | `tasks.md` | 이슈/마일스톤 생성 결과 | — |
| `enforce-speckit.sh` | MODIFY | tool_input(JSON) | PreToolUse 결과 | 기존 + 카테고리 하위 탐색 |

**기존 버그 수정**: `enforce-speckit.sh` L72의 `find ... -maxdepth 1`을 `find ... -maxdepth 2`로 바꾸고, 패턴을 `${PREFIX}-*` → `*/{PREFIX}-*` 병합 탐색으로 교체한다(`specs/NNN-*`와 `specs/{domain}/NNN-*` 모두 적중).

## Template Changes

| 파일 | 변경 요약 |
|------|----------|
| `.specify/templates/spec-template.md` | Clarifications 섹션 예시 + 메타태그 가이드 블록 추가 |
| `.specify/templates/plan-template.md` | `[multi-step: N]` 사용 예시 + Script Inventory 섹션 가이드 |
| `.specify/templates/tasks-template.md` | 모든 태스크에 `[artifact]`, `[why]` 기재 강제(주석 가이드 + 예제) |
| `.specify/templates/quickstart-template.md` (NEW) | 시나리오별 `### Evidence` 서브섹션 규격 |
| `.specify/templates/implement-template.md` (NEW) | DDD 레이어 체크리스트 + Vitest/pytest 전략 + Git Flow Lite 커밋 규칙 + expand-and-contract 재확인 질의 |

## CI Integration

| 워크플로우 | 트리거 | 동작 |
|-----------|--------|------|
| `.github/workflows/speckit-gate.yml` (NEW) | `pull_request` | metatag format + plan-tasks cov + quickstart evidence + migration meta 실행. 실패 시 PR 체크 실패 |
| `.github/workflows/drift-audit.yml` (NEW) | `schedule: cron "0 0 * * 1"` (월 09:00 KST = UTC 월 00:00) | `validate-drift.sh --audit` 실행, `docs/audits/drift/YYYY-MM-DD.md` 생성 후 커밋 |

## Config Schema (harness.json)

```json
{
  "driftAudit": {
    "cron": "0 0 * * 1",
    "reportDir": "docs/audits/drift",
    "severity": { "checkedMissingArtifact": "error", "uncheckedHasArtifact": "warning" }
  },
  "metatag": {
    "required": ["artifact", "why"],
    "optional": ["multi-step", "migration-type"],
    "migrationTypes": ["schema-only", "data-migration"]
  },
  "rollout": { "phase": "expand" },
  "categoryDirs": ["_infra", "_retired", "travel-search", "itinerary", "collaboration", "export"]
}
```

## Rollout (expand-and-contract)

### Phase A — Expand (비차단 도입)

1. 메타태그 파서 + 모든 validator 스크립트 구현, non-blocking 모드(warning만).
2. 신규 템플릿 배포, quickstart-template / implement-template 신규 추가.
3. `harness.json.rollout.phase = "expand"` 유지.
4. 종료 조건: 010 본 피처가 자체 메타태그를 모두 기재하고 validator가 pass.

### Phase B — Migrate (기존 피처 역적용)

1. 활성 피처(004 fullstack, 006 structured-activity, 009 git-release, 007 oauth) tasks.md에 `[artifact]`·`[why]` 소급 기재.
2. 해당 기간 동안 발견되는 drift는 `docs/audits/drift/2026-04-migration.md`에 기록.
3. validator는 여전히 warning. 수정 PR은 기존 피처 각각을 타깃으로 분리 생성.
4. 종료 조건: 활성 피처 전체 validator pass.

### Phase C — Contract (블로킹 전환)

1. `harness.json.rollout.phase = "contract"`.
2. PreToolUse + PR gate가 error를 반환, Edit/Write 및 merge 차단.
3. CI drift audit 스케줄 활성화.
4. 종료 조건: 블로킹 도입 후 1주간 오탐 0.

### Phase 간 전환 게이트

- A→B: 본 피처 tasks.md가 모든 validator를 통과해야 전환한다(자체 dogfooding).
- B→C: 회귀 테스트 케이스(spec SC-001~SC-007 대응 재현)가 모두 예상대로 동작해야 전환한다.

## Project Structure

```text
specs/_infra/010-speckit-harness/
├── spec.md
├── plan.md            ← this file
├── quickstart.md      (NEW — Phase A에서 작성)
└── tasks.md           (Phase A에서 작성)

.specify/
├── config/
│   └── harness.json   (NEW)
├── scripts/bash/
│   ├── enforce-speckit.sh          (MODIFY)
│   ├── validate-metatag-format.sh  (NEW)
│   ├── validate-plan-tasks-cov.sh  (NEW)
│   ├── validate-drift.sh           (NEW)
│   ├── validate-quickstart-ev.sh   (NEW)
│   ├── validate-migration-meta.sh  (NEW)
│   ├── validate-constitution.sh    (NEW)
│   └── merge-tasks-to-issues.sh    (NEW)
└── templates/
    ├── spec-template.md            (MODIFY)
    ├── plan-template.md            (MODIFY)
    ├── tasks-template.md           (MODIFY)
    ├── quickstart-template.md      (NEW)
    └── implement-template.md       (NEW)

.github/workflows/
├── speckit-gate.yml   (NEW)
└── drift-audit.yml    (NEW)

docs/
├── audits/drift/      (NEW — 감사 리포트 누적)
└── evidence/          (NEW — 수동 검증 스크린샷)
```

**Structure Decision**: Bash 스크립트 중심으로 가는 이유 — 기존 `.specify/scripts/bash/` 자산 재활용, 의존성 부담 없음, PreToolUse 훅 입력이 JSON이라 `jq`만 있으면 충분. TypeScript로 재작성하면 `node_modules` 부팅 비용으로 PreToolUse 지연이 커진다.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 신규 config 파일(`harness.json`) | drift 주기·경로를 코드 수정 없이 변경 가능해야 함(FR-015) | 하드코드는 재발 시 롤백 비용 큼 |
| implement/quickstart 신규 템플릿 | 프로젝트 레이어 컨벤션이 speckit 기본 템플릿에 없음(FR-010) | 기본 템플릿 사용 시 프로젝트 맥락 누락 |
| expand-and-contract 3단계 롤아웃 | 기존 활성 피처 tasks.md가 메타태그 없이 존재 — 즉시 블로킹 전환 시 전체 작업 마비 | 일회성 마이그레이션은 역적용 PR 충돌 위험 |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Bash 파서의 메타태그 오인식(예: 주석 블록 내 태그) | 오탐/오검출 | 파싱은 체크박스 라인(`- [ ]`/`- [x]`)과 `##` 이하 컨텍스트로 한정. 코드 블록/주석은 스킵 |
| 기존 활성 피처 소급 기재 작업량 폭증 | Phase B 지연 | 004·006 등 **주요 4건만** 소급 대상으로 고정, 나머지는 `_retired/` 이동 또는 면제 |
| PR 게이트 실패로 인한 배포 블로킹 | 개발 지연 | rollout phase "expand"에서는 warning만. "contract" 전환은 회귀 테스트 통과 후 |
| drift 감사 스케줄 실행 권한(토큰) | CI 실패 | `GITHUB_TOKEN` 기본 권한으로 audit 커밋. fork PR에서는 읽기 전용으로 동작 |
| Claude Code 훅 JSON 필드명 변경 | PreToolUse 훅 작동 불능 | `jq -r '.tool_input.file_path // .file_path // empty'` 식의 복수 경로 fallback 유지 |
