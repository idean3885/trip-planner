---

description: "speckit 하네스 강제 + 커스텀 + drift 방지 태스크 목록"
---

# Tasks: speckit 하네스 강제 + 커스텀 + drift 방지

**Input**: Design documents from `/specs/_infra/010-speckit-harness/`
**Prerequisites**: [spec.md](./spec.md), [plan.md](./plan.md)

**Tests**: Bash 검증기에 대한 재현 테스트는 `scripts/test/`가 아닌 본 피처의 `quickstart.md` 수동 회귀 케이스로 대체한다(Bash 테스트 프레임워크 미도입 결정, plan Technical Context).

**Organization**: User Story 단위로 그룹화한다. 각 태스크는 `[artifact]`, `[why]` 메타태그를 부착해 본 피처가 도입하려는 규약을 자체 dogfooding한다.

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

- **[P]**: 서로 다른 파일·독립 의존성이면 병렬 가능
- `[artifact]`: 산출 파일 상대 경로 (또는 `path::symbol`)
- `[why]`: 이슈 전사 시 합산 그룹 키
- plan multi-step bullet 대응 태스크에는 동일 `[why]` 태그로 묶는다

## Path Conventions

- 스크립트: `.specify/scripts/bash/`
- 템플릿: `.specify/templates/`
- 설정: `.specify/config/`
- CI: `.github/workflows/`
- 리포트: `docs/audits/drift/`, `docs/evidence/`

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 `.specify/config/harness.json` 생성 — driftAudit/metatag/rollout/categoryDirs 기본값 포함 [artifact: .specify/config/harness.json] [why: config-scaffold]
- [ ] T002 [P] `docs/audits/drift/.gitkeep`, `docs/evidence/.gitkeep` 추가 + `docs/audits/drift/README.md` 작성(보관 정책·주기 명시) [artifact: docs/audits/drift/README.md] [why: config-scaffold]
- [ ] T003 [P] `.specify/scripts/bash/common.sh`에 `harness_config_get()`·`feature_dirs()` 헬퍼 추가(`harness.json` 로드 + 카테고리 재귀 탐색) [artifact: .specify/scripts/bash/common.sh] [why: config-scaffold]

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 메타태그 파서와 공용 유틸. 이후 모든 validator가 의존한다.

**⚠️ 이 Phase를 통과하기 전에는 어떤 US도 블로킹 모드로 전환할 수 없다**

- [ ] T004 `validate-metatag-format.sh` 작성 — `[artifact]`, `[why]`, `[multi-step]`, `[migration-type]` 네 태그의 형식 정합성만 검증(괄호 매칭·허용값), 의미 검증 금지 [artifact: .specify/scripts/bash/validate-metatag-format.sh] [why: metatag-parser]
- [ ] T005 [P] `validate-metatag-format.sh`에 체크박스 라인(`- [ ]`/`- [x]`) 한정 파싱 로직 적용 — 코드 블록/주석 스킵 [artifact: .specify/scripts/bash/validate-metatag-format.sh::skip_fenced_and_comment] [why: metatag-parser]
- [ ] T006 [P] FR-017 오탐 회귀 케이스 수동 문서화 — 허용/거부 예시 10건 이상 [artifact: specs/_infra/010-speckit-harness/quickstart.md] [why: metatag-parser]

**Checkpoint**: 파서 통과 → 이후 US의 validator는 이 출력에 의존한다

---

## Phase 3: User Story 1 — plan ↔ tasks 커버리지 검증 (P1, MVP)

**Goal**: plan.md bullet이 tasks.md 태스크에 1:1 이상 매핑되는지 검증, 미매핑 bullet 리포트로 차단.
**Independent Test**: plan.md에 bullet 3개, tasks.md에 2개만 매핑된 시나리오에서 확정 시 차단 + 누락 bullet 리포트 노출.

- [ ] T010 [US1] `validate-plan-tasks-cov.sh` 작성 — plan.md 최상위 bullet 추출 → tasks.md의 `[why]`/bullet 본문 참조로 매핑 확인 [artifact: .specify/scripts/bash/validate-plan-tasks-cov.sh] [why: plan-tasks-coverage]
- [ ] T011 [US1] `[multi-step: N]` 태그가 붙은 bullet은 매핑 태스크가 `N`개 미만이면 차단하도록 분기 추가 [artifact: .specify/scripts/bash/validate-plan-tasks-cov.sh::check_multi_step] [why: plan-tasks-coverage]
- [ ] T012 [P] [US1] `.specify/templates/plan-template.md`에 `[multi-step: N]` 사용 예시 + 허용 표기 가이드 섹션 추가 [artifact: .specify/templates/plan-template.md] [why: plan-tasks-coverage]
- [ ] T013 [P] [US1] `.specify/templates/tasks-template.md`에 `[artifact]`·`[why]` 필수 기재 형식 + 위반 예시 주석 추가 [artifact: .specify/templates/tasks-template.md] [why: plan-tasks-coverage]
- [ ] T014 [US1] quickstart.md에 US1 회귀 시나리오 3건 추가(매핑 성공/부분 누락/multi-step 부족) + ### Evidence 서브섹션 [artifact: specs/_infra/010-speckit-harness/quickstart.md::us1] [why: plan-tasks-coverage]
- [ ] T015 [P] [US1] `.specify/templates/spec-template.md`에 Clarifications 섹션 예시 + 메타태그 4종 사용법 블록 추가(FR-016) [artifact: .specify/templates/spec-template.md] [why: plan-tasks-coverage]

**Checkpoint**: US1 MVP 도달. `validate-plan-tasks-cov.sh` 단독 사용으로도 #191급 매핑 사고를 차단할 수 있어야 한다.

---

## Phase 4: User Story 2 — tasks ↔ artifact drift 감사 (P1)

**Goal**: PR 단계에서 체크박스 ↔ 실제 아티팩트 일치 검증, 주간 감사 리포트 생성.
**Independent Test**: tasks.md의 체크된 태스크가 선언한 경로가 없으면 에러, 미체크인데 경로가 있으면 경고.

- [ ] T020 [US2] `validate-drift.sh` 작성 — tasks.md를 stdin으로 받아 `[artifact]` 경로와 레포 트리 비교, 결과 stdout에 markdown 리포트 [artifact: .specify/scripts/bash/validate-drift.sh] [why: drift-audit]
- [ ] T021 [US2] `validate-drift.sh`에 `--audit` 모드 추가 — 활성 피처 전체 순회 후 `docs/audits/drift/$(date +%Y-%m-%d).md` 생성 [artifact: .specify/scripts/bash/validate-drift.sh::audit_mode] [why: drift-audit]
- [ ] T022 [P] [US2] `.github/workflows/drift-audit.yml` 작성 — cron "0 0 * * 1" UTC(=월 09:00 KST), audit 실행 후 리포트 자동 커밋 [artifact: .github/workflows/drift-audit.yml] [why: drift-audit]
- [ ] T023 [P] [US2] `.github/workflows/speckit-gate.yml`의 drift 단계 추가 — PR 변경 피처에 대해 `validate-drift.sh` 실행 [artifact: .github/workflows/speckit-gate.yml::drift-step] [why: drift-audit]
- [ ] T024 [US2] quickstart.md에 US2 회귀 시나리오 3건(check↔file 일치/불일치/경고) + Evidence [artifact: specs/_infra/010-speckit-harness/quickstart.md::us2] [why: drift-audit]

**Checkpoint**: drift 리포트가 실제 생성되고, 004/006 tasks.md에 시범 실행 시 기존 미체크 항목을 포착해야 한다(Phase B 입력).

---

## Phase 5: User Story 3 — quickstart 실행 증명 게이트 (P1)

**Goal**: quickstart.md의 각 시나리오에 ### Evidence 서브섹션이 있고 자동 테스트 경로 또는 수동 체크리스트+스크린샷이 기재되어 있어야 머지 게이트 통과.

- [ ] T030 [US3] `validate-quickstart-ev.sh` 작성 — `##` 헤더 기반 시나리오 분할, 각 섹션에 `### Evidence` 및 최소 하나의 증거 줄 확인 [artifact: .specify/scripts/bash/validate-quickstart-ev.sh] [why: quickstart-evidence]
- [ ] T031 [US3] 수동 검증 경로: `docs/evidence/<feature>/<scenario>-*.png` 존재 여부 + 체크리스트 `- [x]` 카운트 확인 [artifact: .specify/scripts/bash/validate-quickstart-ev.sh::manual_mode] [why: quickstart-evidence]
- [ ] T032 [P] [US3] `.specify/templates/quickstart-template.md` 신규 작성 — ### Evidence 서브섹션 규격 + 자동/수동 분기 예시 [artifact: .specify/templates/quickstart-template.md] [why: quickstart-evidence]
- [ ] T033 [P] [US3] `speckit-gate.yml`에 quickstart 증거 검증 단계 추가 [artifact: .github/workflows/speckit-gate.yml::quickstart-step] [why: quickstart-evidence]
- [ ] T034 [US3] quickstart.md 본문에 US3 회귀 시나리오(자동/수동 증거 성공·실패 케이스) + Evidence 기록 [artifact: specs/_infra/010-speckit-harness/quickstart.md::us3] [why: quickstart-evidence]

---

## Phase 6: User Story 4 — expand-and-contract 데이터 보정 강제 (P1)

**Goal**: plan의 스키마/enum 변경 bullet에 대응하는 데이터 보정 태스크 강제 + 마이그레이션 메타데이터 구분.

> 이 Phase의 T040은 plan의 "스키마/enum 변경 감지"와 "마이그레이션 메타데이터 검증"을 한 bullet로 묶은 경우 `[multi-step: 2]` 처리 대상(본 피처 자체 dogfooding).

- [ ] T040 [US4] `validate-migration-meta.sh` 작성 — plan.md에서 "schema"/"enum" 키워드 bullet 감지 + 마이그레이션 파일명 헤더 `[migration-type: ...]` 주석 검증 [artifact: .specify/scripts/bash/validate-migration-meta.sh] [why: expand-contract-schema]
- [ ] T041 [US4] plan 감지 bullet당 tasks.md에 `[why: *-backfill]` 또는 `[migration-type: data-migration]`를 가진 태스크 존재 강제(없으면 차단) [artifact: .specify/scripts/bash/validate-migration-meta.sh::require_backfill] [why: expand-contract-schema]
- [ ] T042 [P] [US4] 마이그레이션 템플릿 주석 가이드 추가 — 파일 상단에 `-- [migration-type: schema-only|data-migration]` 헤더를 요구 [artifact: .specify/templates/migration-header-guide.md] [why: expand-contract-schema]
- [ ] T043 [P] [US4] `speckit-gate.yml`에 migration-meta 검증 단계 추가 [artifact: .github/workflows/speckit-gate.yml::migration-step] [why: expand-contract-schema]
- [ ] T044 [US4] quickstart.md에 US4 회귀 시나리오(#191 재현: enum 추가만 있고 data-migration 태스크 부재) + Evidence [artifact: specs/_infra/010-speckit-harness/quickstart.md::us4] [why: expand-contract-schema]

**Checkpoint**: 004의 `20260414053446_add_owner_role` 재현 테스트가 차단 판정으로 나와야 한다.

---

## Phase 7: User Story 5 — 파이프라인 순서 강제 (P2)

**Goal**: specify → clarify → plan → tasks → implement 순서 강제 + 카테고리 하위 구조 탐색 정상화.

- [ ] T050 [US5] `enforce-speckit.sh` 수정 — L72 `find -maxdepth 1`을 `find -maxdepth 2`로, 패턴을 `*/NNN-*`와 `NNN-*` 양쪽 적중으로 교체 [artifact: .specify/scripts/bash/enforce-speckit.sh] [why: order-enforcement]
- [ ] T051 [US5] `enforce-speckit.sh`에 단계별 순서 검증 로직 추가 — spec.md 없이 plan 생성 시도 차단, plan.md 없이 tasks 생성 시도 차단 [artifact: .specify/scripts/bash/enforce-speckit.sh::check_stage_order] [why: order-enforcement]
- [ ] T052 [P] [US5] 기존 `enforce-submit.sh`/`mark-submit-ready.sh` 경로 호환성 회귀 확인 [artifact: .specify/scripts/bash/enforce-submit.sh::compat-check] [why: order-enforcement]
- [ ] T053 [US5] quickstart.md에 US5 회귀(평면/카테고리 양쪽 통과, 선행 누락 시 차단) + Evidence [artifact: specs/_infra/010-speckit-harness/quickstart.md::us5] [why: order-enforcement]

---

## Phase 8: User Story 6 — implement 커스텀 템플릿 (P3)

- [ ] T060 [US6] `.specify/templates/implement-template.md` 신규 작성 — 레이어 체크리스트(도메인/애플리케이션/인프라/표현) + 테스트 전략(프런트/백) + Git Flow Lite 커밋 규칙 [artifact: .specify/templates/implement-template.md] [why: implement-template]
- [ ] T061 [US6] DB 스키마 변경 bullet 감지 시 expand-and-contract 재확인 질의 블록 포함 [artifact: .specify/templates/implement-template.md::expand-contract-prompt] [why: implement-template]
- [ ] T062 [US6] quickstart.md에 US6 템플릿 적용 회귀 케이스 + Evidence [artifact: specs/_infra/010-speckit-harness/quickstart.md::us6] [why: implement-template]

---

## Phase 9: User Story 7 — tasks → 이슈 합산 (P3)

- [ ] T070 [US7] `merge-tasks-to-issues.sh` 작성 — `[why: <tag>]` 같은 태스크를 단일 이슈 초안으로 병합, `gh issue create` 드라이런 출력 [artifact: .specify/scripts/bash/merge-tasks-to-issues.sh] [why: tasks-to-issues]
- [ ] T071 [US7] 추정 공수 합이 8h 초과 시 이슈 분할 로직 — 첫 분할은 T/ID 순서 유지 [artifact: .specify/scripts/bash/merge-tasks-to-issues.sh::split_8h] [why: tasks-to-issues]
- [ ] T072 [US7] 생성 이슈 ≥2건이면 `gh api repos/:owner/:repo/milestones`로 마일스톤 자동 생성 및 연결 [artifact: .specify/scripts/bash/merge-tasks-to-issues.sh::milestone_bind] [why: tasks-to-issues]
- [ ] T073 [US7] quickstart.md에 US7 회귀(why 합산/8h 분할/단일 이슈 마일스톤 미생성) + Evidence [artifact: specs/_infra/010-speckit-harness/quickstart.md::us7] [why: tasks-to-issues]

---

## Phase 10: User Story 8 — 헌법 V/VI 자동 검증 (P3)

- [ ] T080 [US8] `validate-constitution.sh` 작성 — 도메인 소유권 위반 휴리스틱(예: "동행 협업 … Activity … 수정") + 권한 매트릭스 미등록 행위 스캔 [artifact: .specify/scripts/bash/validate-constitution.sh] [why: constitution-scanner]
- [ ] T081 [US8] specify/clarify 단계 안내 메시지에 위반 항목 인용 포함 — 경고만, 차단 없음 [artifact: .specify/scripts/bash/validate-constitution.sh::emit_advice] [why: constitution-scanner]
- [ ] T082 [US8] quickstart.md에 US8 회귀(도메인 위반 표현 감지/권한 미등록 행위) + Evidence [artifact: specs/_infra/010-speckit-harness/quickstart.md::us8] [why: constitution-scanner]

---

## Phase N: Polish & Rollout

- [ ] T090 [P] `specs/_infra/010-speckit-harness/quickstart.md` 최상단에 전체 회귀 시나리오 인덱스 정리 [artifact: specs/_infra/010-speckit-harness/quickstart.md::toc] [why: rollout-migration]
- [ ] T091 Phase B 소급 PR 생성 — 004, 006, 007, 009 tasks.md에 `[artifact]`/`[why]` 기재 [artifact: scripts/migrate/apply-metatag-to-existing-features.sh] [why: rollout-migration]
- [ ] T092 Phase B 마이그레이션 리포트 — `docs/audits/drift/2026-04-migration.md`에 현재 drift 목록 스냅샷 [artifact: docs/audits/drift/2026-04-migration.md] [why: rollout-migration]
- [ ] T093 Phase C 전환 — `.specify/config/harness.json` `rollout.phase`를 "contract"로 변경 + 1주간 모니터링 노트 [artifact: .specify/config/harness.json::rollout-phase-contract] [why: rollout-migration]
- [ ] T094 [P] `CLAUDE.md` "작업 규칙" 섹션 업데이트 — 메타태그 4종 사용 규약 + rollout phase 설명 [artifact: CLAUDE.md::speckit-rules] [why: docs-update]
- [ ] T095 [P] `CHANGELOG.md`에 speckit 하네스 도입 Added 항목 추가(버전은 릴리즈 시 확정) [artifact: CHANGELOG.md::unreleased-added] [why: docs-update]

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 (Setup): 의존 없음. 즉시 시작.
- Phase 2 (Foundational): Phase 1 완료 후. **US1~US8 전체 blocks**.
- Phase 3~10 (US1~US8): Phase 2 완료 후. US1 → US2 → US3 → US4 → US5 → US6 → US7 → US8 순서 권장(P1 먼저).
  - US1~US4(P1)는 각각 독립 MVP로 배포 가능.
- Phase N (Polish & Rollout): Phase 10까지 모든 US 완료 후. Phase B→C 전환은 quickstart 회귀 통과가 조건.

### User Story Dependencies

- US1: Phase 2 완료 후 독립 실행 가능. drift/quickstart와 파서 공유.
- US2: Phase 2 완료 후. US1과 병렬 가능.
- US3: Phase 2 완료 후. US1/US2와 병렬 가능.
- US4: Phase 2 완료 후. US1의 plan 커버리지와 보완 관계(스키마 bullet은 US4에서 추가 검증).
- US5: Phase 2 완료 후. Phase 3~6 구현에 선행될 수 있으나, 파서 수정 중 US1~US4 실험 차단을 피하려면 후반에 배치.
- US6~US8: P3. 모든 P1/P2 완료 후.

### Parallel Opportunities

- T002, T003은 T001 이후 [P].
- T005, T006은 T004 이후 [P].
- 각 US 내부의 [P] 표시 태스크는 파일이 달라 병렬 안전.
- 서로 다른 US 간 validator 스크립트 작업은 파일이 달라 병렬 가능하나, 템플릿 수정은 같은 파일(`tasks-template.md`, `plan-template.md`)을 다수가 건드리므로 순차 처리.

### Within Each User Story

- validator 스크립트 → 템플릿 반영 → CI 단계 추가 → quickstart 회귀 추가 순서.
- quickstart 회귀 작성이 해당 US의 "완료" 정의(본 피처가 스스로 quickstart 증거 게이트를 따름).

---

## Implementation Strategy

### MVP First (US1만)

1. Phase 1 + 2 완료.
2. Phase 3(US1) 완료 → T014의 Evidence 자동/수동 기록.
3. `validate-plan-tasks-cov.sh`를 현재 리포의 004 spec-plan-tasks에 돌려 #191 유형 누락이 감지되는지 확인(회귀 증명).
4. 여기서 멈추고 develop 머지해도 재발 방지 핵심 효과는 달성.

### Incremental Delivery

US1 → US2 → US3 → US4 → US5 순으로 각 단계 독립 배포. P3(US6~US8)는 P1/P2 안정화 이후.

### Rollout 단계 맵

- Phase 1~10 완료 = **expand 완료**.
- T091~T092 실행 = **migrate 완료**.
- T093 실행 = **contract 진입**.

---

## Notes

- 본 피처의 모든 태스크가 `[artifact]`·`[why]` 메타태그를 부착한다(dogfooding — Phase A 완료 판정 조건 중 하나).
- T011, T041, T061처럼 한 스크립트 내부의 서브 함수 산출물은 `[artifact: path::symbol]` 형태로 식별한다.
- 이슈 전사 시 `[why]` 태그 기준 합산이 적용되면 이 tasks.md는 11~12개 이슈로 묶인다(config-scaffold / metatag-parser / 각 US / rollout-migration / docs-update).
- 8h 분할 판정은 구현 시점 추정으로 결정(본 파일은 추정치 미기재 — `merge-tasks-to-issues.sh` dry-run에서 사용자 질의).
