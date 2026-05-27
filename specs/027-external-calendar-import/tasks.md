---

description: "외부 캘린더 import — 작업 목록"
---

# Tasks: 외부 캘린더 import

**Input**: Design documents in `/specs/027-external-calendar-import/`
**Prerequisites**: plan.md, spec.md (US1·US2·US3), research.md, data-model.md, contracts/, quickstart.md
**Related**: Epic #527, Milestone v2.15.0 (#36), ADR 0003 (유지) + ADR 0006(추가)

## Format

- **[P]**: 병렬 가능 (다른 파일, 의존성 없음)
- **[USx]**: 어느 User Story에 속하는지(US1·US2·US3). Setup·Foundational·Polish는 라벨 없음.
- **[artifact: ...]**: 산출 파일 — drift 감사 대상 (필수)
- **[why: ...]**: plan Coverage Target 매핑 — plan-tasks-cov 검증 대상 (필수)
- **[multi-step: N]**: 같은 `[why]` 묶음의 최소 태스크 수(plan과 동일 N)

---

## Phase 1: Setup

**Purpose**: 작업 진입 전 점검. 외부 의존성 추가 없음(plan Technical Context 명시).

- [x] T001 ADR 0006 외부 캘린더 import 정책 초안 작성 — 외부 → 내부 단방향, 캘린더 정본 미변경, 권한 매트릭스 추가 근거 정리 [artifact: docs/adr/0006-external-calendar-import-policy.md] [why: adr-import-policy]

---

## Phase 2: Foundational (Blocking)

**Purpose**: US1·US2·US3 어느 것이든 시작하기 전에 끝나야 할 schema·권한 기반.

**⚠️ Checkpoint**: 본 phase 통과 전 US 작업 착수 금지.

- [x] T002 Prisma schema에 `ActivityDraft`·`ImportRun` 모델 + `ActivityDraftStatus`·`CalendarProvider` enum 추가 [artifact: prisma/schema.prisma::ActivityDraft] [why: draft-schema] [multi-step: 2]
- [x] T003 마이그레이션 SQL 생성 — `CREATE TYPE` + `CREATE TABLE`, 헤더 `[migration-type: schema-only]` 명시. trip 삭제 cascade·draft-importRun restrict FK 포함 [artifact: prisma/migrations/20260527_add_activity_draft/migration.sql] [why: draft-schema] [multi-step: 2]
- [x] T004 권한 매트릭스에 "외부 캘린더 import" 행 추가 + 헬퍼 `canImportCalendar(role)` 구현 [artifact: src/lib/permissions/activity.ts::canImportCalendar] [why: import-api]

---

## Phase 3: US1 — 외부 캘린더의 일정을 trip으로 가져오기 (P1) 🎯 MVP

**Goal**: 사용자가 trip 페이지에서 외부 캘린더 1개를 선택하면 trip 기간 내 이벤트가 draft로 등록된다.

**Independent Test**: dev에서 외부 Google 캘린더에 이벤트 3건 만든 후 trip 페이지에서 import 실행 → draft 3건 노출(quickstart US1-1).

### 도메인 어댑터·서비스

- [x] T005 [P] [US1] `ExternalCalendarFetcher` 인터페이스 + Google 어댑터 구현 — `listCalendars`·`listEvents` [artifact: src/lib/calendar-import/google.ts] [why: provider-fetch] [multi-step: 2]
- [x] T006 [P] [US1] Apple CalDAV 어댑터 구현 — 같은 시그니처, 기존 `src/lib/calendar/provider/apple-client.ts` 재사용 + 자체 ICS 파서(ics-parser.ts) [artifact: src/lib/calendar-import/apple.ts] [why: provider-fetch] [multi-step: 2]
- [x] T007 [US1] 외부 이벤트 → `ActivityDraft` 매퍼 (제목·시간·장소 문자열·설명·isAllDay·timezone 처리) [artifact: src/lib/calendar-import/mapper.ts::mapExternalEvent] [why: draft-schema]
- [x] T008 [US1] 멱등성 유틸 — `(provider, externalCalendarId, externalEventId)` 키 lookup + DB 유니크 fallback [artifact: src/lib/calendar-import/idempotency.ts] [why: import-api]
- [x] T009 [US1] import 서비스 오케스트레이터 — fetch → trip 기간 필터 → 매핑 → 멱등 처리 → `ImportRun` 기록. 이벤트별 try/catch + failedTitles 최대 3건 [artifact: src/lib/calendar-import/service.ts::runImport] [why: import-api] [multi-step: 2]

### API

- [x] T010 [US1] `POST /api/trips/<id>/calendar-import` route — host 이상 권한 검증, 외부 계정 미연결 시 409 응답 [artifact: src/app/api/trips/<id>/calendar-import/route.ts::POST] [why: import-api] [multi-step: 2]
- [x] T011 [P] [US1] `GET /api/users/me/external-calendars` route — trip-planner 관리 캘린더 제외 [artifact: src/app/api/users/me/external-calendars/route.ts::GET] [why: ui-import-trigger] [multi-step: 2]
- [x] T012 [P] [US1] `GET /api/trips/<id>/drafts` route — status 쿼리(기본 PENDING) [artifact: src/app/api/trips/<id>/drafts/route.ts::GET] [why: ui-draft-row]

### UI

- [x] T013 [P] [US1] `CalendarImportPanel` 컴포넌트 — 외부 캘린더 목록 + 선택 + 트리거, 미연결 시 안내 [artifact: src/components/calendar-import/CalendarImportPanel.tsx] [why: ui-import-trigger] [multi-step: 2]
- [x] T014 [US1] trip 상세 SidePanel에 ImportPanel + DraftListPanel 추가 [artifact: src/app/trips/<id>/SidePanel.tsx] [why: ui-import-trigger]
- [x] T015 [P] [US1] `DraftListPanel` 컴포넌트 — dimmed + "외부 캘린더에서 가져옴" 배지 (SidePanel 별도 섹션) [artifact: src/components/calendar-import/DraftListPanel.tsx] [why: ui-draft-row]
- [ ] T016 [US1] trip 일정 화면(Day 리스트)에 PENDING draft를 정식 Activity와 같이 표시 [artifact: src/app/trips/<id>/components/DayCard.tsx::renderDraftSection] [why: ui-draft-row] **(v2.15.0 deferred — Day 통합 표시는 후속 PR. 1차는 SidePanel 별도 섹션으로 가시화.)**
- [x] T017 [P] [US1] sonner toast로 imported/skipped/failed 카운트 + failedTitles ≤ 3 표시 [artifact: src/components/calendar-import/CalendarImportPanel.tsx::handleImport] [why: ui-import-summary]

### 단위/통합 테스트

- [ ] T018 [P] [US1] mapper 단위 테스트 — 매핑 가능 필드 자동 채움, timezone null 처리, all-day 분기 [artifact: src/lib/calendar-import/mapper.spec.ts] [why: draft-schema]
- [ ] T019 [P] [US1] service 단위 테스트 — trip 기간 필터, 부분 실패 시 failedCount/failedTitles [artifact: src/lib/calendar-import/service.spec.ts] [why: import-api]
- [ ] T020 [US1] import route 통합 테스트 — host 권한 OK, GUEST 403, 미연결 409, 정상 import 200 [artifact: src/app/api/trips/<id>/calendar-import/route.spec.ts] [why: import-api]

**Checkpoint**: US1만 머지해도 사용자가 외부 일정을 draft로 가져와 trip 화면에서 확인 가능.

---

## Phase 4: US2 — draft → 정식 Activity 승격 (P2)

**Goal**: 사용자가 draft를 클릭해 필수 필드를 채우면 정식 Activity로 전환되고 trip 캘린더(ADR 0003 모델)에 push된다.

**Independent Test**: PENDING draft 1건에 대해 승격 모달에서 type·attractionId·reservationStatus·timezone 입력 후 "승격" → 일반 Activity로 전환되고 외부 캘린더 UI에서 trip 캘린더 이벤트 확인(quickstart US2-1·US2-3).

### API

- [x] T021 [US2] `POST /api/trips/<id>/drafts/<draftId>/promote` route — 필수 필드 검증(422), Activity 생성 + draft.status=PROMOTED 전이 + 기존 push 경로 연결 [artifact: src/app/api/trips/<id>/drafts/<draftId>/promote/route.ts::POST] [why: draft-promote]

### 도메인

- [x] T022 [US2] draft → Activity promotion 서비스 — 트랜잭션으로 Activity insert + draft update + day 자동 매칭 [artifact: src/lib/calendar-import/promotion.ts::promoteDraft] [why: draft-promote]

### UI

- [x] T023 [P] [US2] DraftListPanel 내장 promote dialog — 필수 필드(category, reservationStatus, startTimezone, endTimezone) 입력 폼 [artifact: src/components/calendar-import/DraftListPanel.tsx::PromoteDialog] [why: ui-promote-modal] [multi-step: 2]
- [x] T024 [US2] DraftListPanel row 클릭 시 promote dialog 오픈 + 422 응답에서 toast 안내 [artifact: src/components/calendar-import/DraftListPanel.tsx::openPromote] [why: ui-promote-modal] [multi-step: 2]

### 테스트

- [ ] T025 [P] [US2] promotion 서비스 단위 테스트 — Activity 생성, draft 전이, day 매칭 [artifact: src/lib/calendar-import/promotion.spec.ts] [why: draft-promote]
- [ ] T026 [US2] promote route 통합 테스트 — 필수 누락 422, 정상 200, 권한 격리 [artifact: src/app/api/trips/<id>/drafts/<draftId>/promote/route.spec.ts] [why: draft-promote]

**Checkpoint**: US2 머지 시 draft가 정식 일정으로 닫히고 trip 캘린더 push까지 동작.

---

## Phase 5: US3 — 멱등성 + "다시 가져오기" (P3)

**Goal**: 같은 import를 두 번 실행해도 중복 없음. 사용자가 "다시 가져오기" 명시 선택 시 매핑 가능 필드만 덮어쓰기.

**Independent Test**: import 후 같은 캘린더로 재실행 → draft 개수 그대로(skip 카운트만 증가). draft에 사용자가 임시로 채운 timezone 보존(quickstart US3-1·US3-2).

### API

- [x] T027 [US3] `POST /api/trips/<id>/drafts/<draftId>/refresh` route — 외부 최신 값 fetch, 매핑 가능 필드만 update, PROMOTED 거부(409) [artifact: src/app/api/trips/<id>/drafts/<draftId>/refresh/route.ts::POST] [why: import-api]
- [x] T028 [P] [US3] `DELETE /api/trips/<id>/drafts/<draftId>` route — 단건 삭제(외부 캘린더 영향 없음) [artifact: src/app/api/trips/<id>/drafts/<draftId>/route.ts::DELETE] [why: ui-draft-row]

### UI

- [x] T029 [P] [US3] DraftListPanel row 컨텍스트 메뉴(다시 가져오기 / 삭제) [artifact: src/components/calendar-import/DraftListPanel.tsx::ContextMenu] [why: ui-draft-row]

### 테스트

- [ ] T030 [P] [US3] idempotency 단위 테스트 — 동일 키 lookup·DB 유니크 fallback [artifact: src/lib/calendar-import/idempotency.spec.ts] [why: import-api]
- [ ] T031 [US3] refresh route 통합 테스트 — 매핑 불가 필드 보존, PROMOTED 409 [artifact: src/app/api/trips/<id>/drafts/<draftId>/refresh/route.spec.ts] [why: import-api]

**Checkpoint**: US3 머지 시 사용자가 import를 반복해도 안전, 외부 변경 반영도 사용자 통제 하에 가능.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T032 trip 삭제 시 ActivityDraft·ImportRun cascade 동작 통합 테스트 — Prisma onDelete 동작 확인 [artifact: src/app/api/trips/<id>/route.cascade.spec.ts] [why: draft-cascade]
- [ ] T033 OpenAPI 스펙에 신규 5개 endpoint 추가(operation·security·error 4xx·cost 표기 일관) [artifact: src/lib/openapi.ts::calendarImportPaths] [why: import-api]
- [ ] T034 [P] /about·/docs OpenAPI 문서 회귀 — 신규 endpoint 표시 확인(spec 014 풀폭 레이아웃 회귀 없음) [artifact: src/app/docs/page.tsx] [why: ui-import-summary]
- [x] T035 단편 작성 — feat 타입 [artifact: changes/527.feat.md] [why: adr-import-policy]
- [ ] T036 quickstart Evidence 실증 — US1·US2·US3 스크린샷 + 자동 테스트 통과 로그 첨부 [artifact: docs/evidence/027-external-calendar-import/] [why: adr-import-policy]

---

## Dependency Graph

```text
Phase 1 (Setup)
   T001 (ADR) ─── 독립 (병렬 가능)

Phase 2 (Foundational) — 차단 prerequisite
   T002 (schema) → T003 (migration) ─┐
   T004 (permission)                  ├─→ US1·US2·US3 모두
                                      ┘

Phase 3 (US1 — MVP)
   T002·T003 → T005·T006 (provider 어댑터, 병렬)
            ↓
            T007 (mapper) ── T008 (idempotency) ── T009 (service)
                                                      ↓
                                T010 (import route) + T011·T012 (보조 route, 병렬)
                                                      ↓
                                T013·T015·T017 (UI 컴포넌트, 병렬)
                                                      ↓
                                T014·T016 (페이지 통합)
                                                      ↓
                                T018·T019·T020 (테스트, 병렬)

Phase 4 (US2) — US1의 T009·T010 필요
   T022 (promotion service)
   → T021 (promote route)
   → T023·T024 (UI, 일부 병렬)
   → T025·T026 (테스트, 병렬)

Phase 5 (US3) — US1·US2 머지 후
   T027 (refresh route) + T028 (delete route, 병렬)
   → T029 (UI 컨텍스트 메뉴)
   → T030·T031 (테스트, 병렬)

Phase 6 (Polish) — 전체 후
   T032 (cascade test) + T033·T034 (openapi 회귀, 병렬) + T035 (단편) + T036 (Evidence)
```

## Parallel Opportunities

- **Phase 2**: T002 → T003은 순차, T004는 T002와 병렬 가능(권한 헬퍼는 schema 독립).
- **Phase 3**: T005·T006(provider 어댑터)는 독립 파일. T011·T012(보조 GET route)는 T010과 병렬. T013·T015·T017(UI 컴포넌트)는 독립 파일. T018·T019·T020(테스트)는 구현 완료 후 병렬.
- **Phase 4**: T023(UI)은 T021·T022(API·도메인)와 일정 부분 병렬.
- **Phase 5**: T027·T028은 독립 route. T030·T031 병렬.
- **Phase 6**: T032·T033·T034·T035 모두 다른 파일이라 병렬.

## MVP Scope

**US1 단독 머지**가 사용자 가치를 닫는다(외부 → draft → 일정 화면 표시). US2·US3는 후속 PR로 점진 머지(헌법 IV Incremental Release).

## Coverage Target ↔ tasks 매핑 검증

| [why] tag | plan multi-step | 매핑 task 수 |
|-----------|-----------------|--------------|
| draft-schema | 2 | T002, T003, T007, T018 — 4건 (≥ 2 OK) |
| provider-fetch | 2 | T005, T006 — 2건 (= 2 OK) |
| import-api | 2 | T004, T008, T009, T010, T019, T020, T027, T030, T031, T033 — 10건 (≥ 2 OK) |
| draft-promote | — | T021, T022, T025, T026 — 4건 (≥ 1 OK) |
| ui-draft-row | — | T012, T015, T016, T028, T029 — 5건 (≥ 1 OK) |
| ui-import-trigger | 2 | T011, T013, T014 — 3건 (≥ 2 OK) |
| ui-promote-modal | 2 | T023, T024 — 2건 (= 2 OK) |
| ui-import-summary | — | T017, T034 — 2건 (≥ 1 OK) |
| draft-cascade | — | T032 — 1건 (≥ 1 OK) |
| adr-import-policy | — | T001, T035, T036 — 3건 (≥ 1 OK) |

## Implementation Strategy

1. **Phase 1·2 먼저** — ADR + schema + 권한 매트릭스. 머지 1회.
2. **US1 (MVP)** — 외부 → draft → 화면 표시. 머지 1회.
3. **US2** — 승격 흐름. 머지 1회.
4. **US3** — 멱등성·refresh·delete. 머지 1회.
5. **Polish** — 단편·Evidence·OpenAPI 회귀. 머지 1회.

각 단계는 develop으로 PR → 머지 → dev.trip.idean.me 회귀 → 다음 단계 진입.

## 검증 게이트

- `validate-metatag-format.sh` — 4종 메타태그 형식
- `validate-plan-tasks-cov.sh` — plan ↔ tasks 매핑 수 (위 표 통과)
- `validate-quickstart-ev.sh` — quickstart Evidence
- `validate-migration-meta.sh` — T003 마이그레이션 헤더(`[migration-type: schema-only]`)
- `validate-constitution.sh` — 헌법 V·VI 휴리스틱(권한 매트릭스 추가는 헌법 VI 정상 절차)
