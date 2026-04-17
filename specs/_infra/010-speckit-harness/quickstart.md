# Quickstart: speckit 하네스 회귀 시나리오

**Feature**: `010-speckit-harness` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

본 문서는 각 User Story의 수동/자동 회귀 케이스를 정의한다. 각 시나리오는 `### Evidence` 서브섹션으로 실행 증거를 기록하며, PR 머지 게이트가 이 증거 존재 여부를 자동 검증한다(FR-005).

## Index

- [Foundational — 메타태그 파서](#foundational--메타태그-파서)
- [US1 — plan ↔ tasks 커버리지](#us1--plan--tasks-커버리지)
- [US2 — tasks ↔ artifact drift 감사](#us2--tasks--artifact-drift-감사)
- [US3 — quickstart 실행 증명](#us3--quickstart-실행-증명)
- [US4 — expand-and-contract 데이터 보정](#us4--expand-and-contract-데이터-보정)
- [US5 — 파이프라인 순서 강제](#us5--파이프라인-순서-강제)
- [US6 — implement 커스텀 템플릿](#us6--implement-커스텀-템플릿)
- [US7 — tasks → 이슈 합산](#us7--tasks--이슈-합산)
- [US8 — 헌법 V/VI 검증](#us8--헌법-vvi-검증)

---

## Foundational — 메타태그 파서

### Scenario F1: 허용 형식 10건 통과

입력:

```
- [ ] T001 설정 로드 [artifact: .specify/config/harness.json] [why: config-scaffold]
- [ ] T002 파서 [artifact: .specify/scripts/bash/validate-metatag-format.sh::skip_fenced] [why: metatag-parser]
- [ ] T003 다단 [multi-step: 2] [why: plan-tasks-coverage]
- [ ] T004 마이그레이션 [migration-type: data-migration] [why: expand-contract-schema]
```

기대: `validate-metatag-format.sh` exit 0, "위반 0건" 출력.

### Scenario F2: 거부 형식 10건 차단

다음 10건은 `--self-test` 거부 fixture에 그대로 매핑된다. 각 줄에서 기대되는 위반 유형을 표기.

| # | 입력 | 기대 위반 |
|---|------|----------|
| R1 | `- [ ] R1 빈 값 [artifact: ] [why: x]` | `empty value for [artifact]` |
| R2 | `- [ ] R2 콜론 뒤 공백 없음 [artifact:x] [why: y]` | `missing space after colon in [artifact:x]` |
| R3 | `- [ ] R3 공백 오류 [why :x]` | `whitespace before colon in [why :x]` |
| R4 | `- [ ] R4 multi-step 0 [multi-step: 0] [why: x]` | `value must be integer ≥ 2 (got: '0')` |
| R5 | `- [ ] R5 multi-step 비숫자 [multi-step: two] [why: x]` | `value must be integer ≥ 2 (got: 'two')` |
| R6 | `- [ ] R6 multi-step 1 [multi-step: 1] [why: x]` | `value must be integer ≥ 2 (got: '1')` |
| R7 | `- [ ] R7 migration-type 미허용 [migration-type: hybrid] [why: x]` | `not in allowed list: schema-only,data-migration` |
| R8 | `- [ ] R8 unmatched bracket [artifact: x [why: y]` | `nested '[' inside metatag value` |
| R9 | `- [ ] R9 중첩 [artifact: [nested]] [why: y]` | `nested '[' inside metatag value` |
| R10 | `- [ ] R10 빈 why [artifact: x] [why: ]` | `empty value for [why]` |

기대: 각 줄 번호 + 위반 사유가 stderr에 명시되며 총 위반 10건, exit ≠ 0.

### Scenario F3: 코드 블록·주석·인라인 코드 스킵

다음 세 형태는 모두 파서가 스킵해야 한다 (`--self-test` allow fixture에 포함).

- **코드 펜스**: 3개 이상 백틱으로 감싼 블록. 닫는 펜스는 여는 펜스 이상 길이여야 닫힌다(CommonMark). 내부의 `- [ ] NOT_CHECKED [artifact: ] [why: ]` 같은 형식 불량 예시가 있어도 전체 스킵.
- **HTML 주석**: `<!-- ... -->` 단일·다중 줄. 주석 내부의 체크박스·메타태그 표기 무시.
- **인라인 코드 스팬**: 단일 백틱 `` ` ` ``으로 감싼 부분. 태스크 설명 중 `` `[multi-step: N]` ``처럼 예시 표기가 섞여도 태그로 오인되지 않음. 같은 라인의 밖에 있는 실제 메타태그는 정상 검증.

기대: 세 형태 모두 내부의 `[...]`는 무시되고, 외부의 실제 메타태그만 검증 대상.

### Evidence

- 자동 테스트: `.specify/scripts/bash/validate-metatag-format.sh --self-test` (허용 10건 + 거부 10건 내장 fixture)
- 010 dogfood: `validate-metatag-format.sh specs/_infra/010-speckit-harness/{tasks,quickstart}.md` → 위반 0건
- 수동 체크리스트:
  - [x] F1 — 10건 허용 형식 통과 확인 (#206 PR)
  - [x] F2 — 10건 거부 형식 차단 확인 (#206 PR)
  - [x] F3 — 코드/주석/인라인 코드 스킵 확인 (#206 PR)
- 스크린샷: 해당없음(CLI 출력 로그로 대체, `--self-test` 재현 가능)

---

## US1 — plan ↔ tasks 커버리지

### Scenario US1-1: 전체 매핑 통과

plan.md에 3개 bullet, tasks.md에 3개 이상 대응 태스크.

기대: `validate-plan-tasks-cov.sh` exit 0.

### Scenario US1-2: 부분 누락 차단

plan.md 3개 bullet 중 2개만 tasks.md에 매핑.

기대: exit ≠ 0, 누락된 3번째 bullet 원문 + 줄 번호 stderr 출력.

### Scenario US1-3: multi-step 부족 차단

plan.md bullet에 `[multi-step: 2]` 태그, tasks.md에 해당 bullet 참조 태스크 1개만 존재.

기대: exit ≠ 0, "multi-step N=2 요구, 매핑 1건" 메시지.

### Evidence

- 자동 테스트: `.specify/scripts/bash/validate-plan-tasks-cov.sh --self-test` (3 케이스 내장)
- 010 dogfood: `validate-plan-tasks-cov.sh --feature specs/_infra/010-speckit-harness` → 통과 (Coverage Targets 12개 모두 tasks 매핑 확인)
- 수동 체크리스트:
  - [x] US1-1 통과 확인 (#207 PR)
  - [x] US1-2 차단 + plan.md:N [why: X] requires >=1 tasks, found 0 출력 (#207 PR)
  - [x] US1-3 차단 + plan.md:N [why: X] requires >=2 tasks, found 1 출력 (#207 PR)
- 스크린샷: 해당없음(CLI 로그 재현 가능)

---

## US2 — tasks ↔ artifact drift 감사

### Scenario US2-1: 체크된 태스크의 아티팩트 존재 — 통과

tasks.md에 `- [x] T001 [artifact: existing/file.ts]`, 해당 파일 존재.

기대: drift 리포트에 위반 없음.

### Scenario US2-2: 체크됐으나 파일 부재 — 에러

tasks.md에 `- [x] T002 [artifact: missing/file.ts]`, 해당 파일 없음.

기대: drift 리포트의 `Errors` 섹션에 T002 등장.

### Scenario US2-3: 미체크인데 파일 존재 — 경고

tasks.md에 `- [ ] T003 [artifact: existing/other.ts]`, 해당 파일 존재.

기대: drift 리포트의 `Warnings` 섹션에 T003 등장.

### Scenario US2-4: 주간 감사 실행

`validate-drift.sh --audit`를 cron 시뮬레이션으로 실행.

기대: `docs/audits/drift/YYYY-MM-DD.md`가 생성되며 활성 피처 전체 요약 포함.

### Evidence

- 자동 테스트: `.specify/scripts/bash/validate-drift.sh --self-test` (4분면 모의)
- audit 모드 재현: `validate-drift.sh --audit --out /tmp/drift.md` → `_infra/010-speckit-harness` drift(errors=0, warnings=16) 리포트 생성 확인 (#208 PR)
- CI 연동: `.github/workflows/drift-audit.yml` 주간 스케줄 + `speckit-gate.yml`의 drift 단계
- 수동 체크리스트:
  - [x] US2-1 체크+존재 통과 확인 (#208 PR)
  - [x] US2-2 체크+부재 에러 확인 (#208 PR)
  - [x] US2-3 미체크+존재 경고 확인 (#208 PR)
  - [x] US2-4 audit 모드 리포트 생성 확인 (#208 PR)
- 스크린샷: 해당없음(audit 리포트 마크다운이 기록)

---

## US3 — quickstart 실행 증명

### Scenario US3-1: Evidence 서브섹션 모두 존재 — 통과

모든 시나리오 섹션에 `### Evidence` 존재 + 최소 하나의 증거 줄.

기대: `validate-quickstart-ev.sh` exit 0.

### Scenario US3-2: Evidence 누락 — 차단

한 시나리오 섹션에 Evidence 서브섹션 부재.

기대: exit ≠ 0, 누락 시나리오명 출력.

### Scenario US3-3: 수동 체크리스트 미체크 — 차단

Evidence에 `- [ ]` 체크리스트만 있고 `- [x]`가 없고 자동 테스트 경로도 없음.

기대: exit ≠ 0 (또는 phase=expand인 경우 경고, exit 0).

### Scenario US3-4: phase-aware 동작

`.specify/config/harness.json`의 `rollout.phase`가 `expand`/`migrate`이면 위반 발견 시 경고만 출력(exit 0). `contract`이면 차단(exit 1).

기대:
- `expand`: `⚠ quickstart evidence 경고: N건 (phase=expand, 비차단)`
- `contract`: `✗ quickstart evidence 위반: N건 (phase=contract, 차단)`

### Evidence

- 자동 테스트: `.specify/scripts/bash/validate-quickstart-ev.sh --self-test` (5 케이스 내장)
- 010 dogfood: `validate-quickstart-ev.sh --feature specs/_infra/010-speckit-harness` → phase=expand 기준 경고 수 확인(미구현 US 섹션의 자연스러운 경고 포함)
- 수동 체크리스트:
  - [x] US3-1 자동/수동 통과 확인 (#209 PR)
  - [x] US3-2 Evidence 부재 차단 (#209 PR self-test)
  - [x] US3-3 Evidence 증거 없음 (체크리스트만) 판정 (#209 PR self-test)
  - [x] US3-4 phase-aware 동작 확인 (#209 PR — `harness.json` 수정 후 재실행)
- 스크린샷: 해당없음(CLI 로그 재현 가능)

---

## US4 — expand-and-contract 데이터 보정

### Scenario US4-1: #191 재현 — enum 추가 + 보정 태스크 부재

plan.md에 "OWNER 역할 추가" bullet, tasks.md에 schema-only 마이그레이션 태스크만 존재.

기대: `validate-migration-meta.sh` exit ≠ 0, "data-migration 태스크 필요" 메시지.

### Scenario US4-2: 보정 태스크 포함 — 통과

plan bullet + tasks.md에 `[migration-type: data-migration]` 또는 `[why: *-backfill]` 태스크 존재.

기대: exit 0.

### Scenario US4-3: 마이그레이션 헤더 누락 — 차단

마이그레이션 SQL 파일 상단에 `-- [migration-type: ...]` 헤더 없음.

기대: exit ≠ 0.

### Evidence

- 자동 테스트: `.specify/scripts/bash/validate-migration-meta.sh --self-test`
- 004의 `20260414053446_add_owner_role`에 대해 Scenario US4-1이 예상대로 차단되는지 확인
- 스크린샷: `docs/evidence/010-speckit-harness/us4-*.png`

---

## US5 — 파이프라인 순서 강제

### Scenario US5-1: 카테고리 하위 구조 탐색

현재 브랜치 `010-speckit-harness`, spec이 `specs/_infra/010-speckit-harness/`에 존재.

기대: `enforce-speckit.sh` exit 0 (maxdepth 2 적용 후).

### Scenario US5-2: spec 없이 plan 시도

plan.md 없이 plan 명령 모사.

기대: 차단 + specify 안내.

### Scenario US5-3: tasks 없이 소스 편집 시도

tasks.md 없이 `.ts` 파일 Edit.

기대: PreToolUse 차단 + tasks 생성 안내.

### Evidence

- 자동 테스트: `.specify/scripts/bash/enforce-speckit.sh --self-test`
- develop 기준으로 기존 훅 동작 회귀(카테고리 하위 피처에서 오작동하지 않음) 확인
- 스크린샷: `docs/evidence/010-speckit-harness/us5-*.png`

---

## US6 — implement 커스텀 템플릿

### Scenario US6-1: 레이어 체크리스트 노출

`/speckit.implement` 시 템플릿이 도메인/애플리케이션/인프라/표현 레이어 체크를 제시.

기대: 사용자가 확인 후 구현 진행.

### Scenario US6-2: DB 스키마 변경 감지 시 expand-and-contract 질의

plan에 스키마 변경 bullet이 있으면 implement 템플릿이 재확인 질의를 포함.

기대: 해당 질의가 프롬프트에 포함됨.

### Evidence

- 수동 체크리스트:
  - [ ] US6-1 — 체크리스트 노출 확인
  - [ ] US6-2 — 질의 포함 확인
- 스크린샷: `docs/evidence/010-speckit-harness/us6-*.png`

---

## US7 — tasks → 이슈 합산

### Scenario US7-1: 동일 why 합산

`[why: plan-tasks-coverage]`를 가진 태스크 5개 → 단일 이슈 초안.

기대: `merge-tasks-to-issues.sh --dry-run`이 1건 출력.

### Scenario US7-2: 8h 초과 분할

합산 추정 12h → 2개 이슈로 분할.

기대: 분할 이슈 2건, 각 ≤ 8h.

### Scenario US7-3: 단일 이슈 — 마일스톤 미생성

why 그룹이 하나뿐.

기대: 이슈만 생성, 마일스톤 호출 없음.

### Scenario US7-4: 2건 이상 — 마일스톤 자동 생성

why 그룹이 2개 이상.

기대: 피처 명칭 마일스톤 자동 생성 + 이슈 연결.

### Evidence

- 자동 테스트: `.specify/scripts/bash/merge-tasks-to-issues.sh --dry-run --self-test`
- 본 tasks.md를 입력으로 한 dry-run 출력 캡처 (11~12 이슈 + 마일스톤 예상)
- 스크린샷: `docs/evidence/010-speckit-harness/us7-*.png`

---

## US8 — 헌법 V/VI 검증

### Scenario US8-1: 도메인 위반 감지

spec 본문에 "동행 협업 서비스가 Activity를 직접 수정" 표현.

기대: `validate-constitution.sh` 경고 출력(차단 아님).

### Scenario US8-2: 권한 매트릭스 미등록 행위

FR에 "게스트가 여행을 삭제" 같은 매트릭스 미정의 행위.

기대: 경고 출력.

### Scenario US8-3: 통과 케이스

본 spec.md 자체를 입력.

기대: 경고 0건(본 피처가 도메인·권한을 건드리지 않음).

### Evidence

- 자동 테스트: `.specify/scripts/bash/validate-constitution.sh --self-test`
- 본 spec.md를 입력으로 한 실행 결과 — 경고 0건 예상
- 스크린샷: `docs/evidence/010-speckit-harness/us8-*.png`

---

## 실행 규약

1. 각 시나리오의 `### Evidence`에 기록되는 파일은 **자동 테스트 경로** 또는 **체크리스트 + 스크린샷 경로** 중 최소 하나가 충족되어야 한다.
2. 스크린샷 디렉토리는 `docs/evidence/010-speckit-harness/`로 고정한다. 다른 피처는 `docs/evidence/<feature-dir>/`.
3. 자동 테스트 경로는 `--self-test` 모드를 제공하는 스크립트만 허용한다(재현성 보장).
4. 본 파일 자체가 US3의 positive 케이스로 기능하므로, PR 머지 전 `### Evidence` 서브섹션을 실제 증거로 업데이트해야 한다.
