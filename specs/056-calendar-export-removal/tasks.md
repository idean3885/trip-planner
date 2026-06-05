---

description: "Task list for 외부 캘린더 내보내기 제품 노출 제거"
---

# Tasks: 외부 캘린더 내보내기 제품 노출 제거 (SSOT 단방향 정립)

**Input**: Design documents from `/specs/056-calendar-export-removal/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 회귀 가드가 핵심 성공 기준(SC-001/003/004)이므로 테스트 태스크를 포함한다.

**Organization**: User Story 단위로 그룹화. 각 스토리는 독립적으로 구현·검증 가능.

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

## Phase 1: Setup

기존 코드베이스 변경 위주로 별도 초기화 없음. 브랜치 `056-calendar-export-removal`에서 작업.

- [x] T001 현행 export/import 경계 재확인 — 레거시 컴포넌트(`GCalLinkPanel`/`AppleEntryCard`/`CalendarProviderChoice`)의 활성 렌더 경로 부재 검증(grep import) [artifact: specs/056-calendar-export-removal/research.md] [why: ui-importonly]

## Phase 2: Foundational

차단 선행 작업 없음(행위 제거·게이트 재정의 위주). 모델·마이그레이션 변경 없음.

---

## Phase 3: User Story 1 - 활동 변경 시 외부 캘린더 미반영 (Priority: P1)

**Goal**: 활동 CRUD·초안 확정 시 외부 캘린더 자동 반영(auto-sync) 호출을 제거해 신규 오염을 차단한다.

**Independent Test**: 연동 여행에서 활동 추가·수정·삭제·초안 확정 후 외부 캘린더 쓰기가 트리거되지 않음을 테스트로 확인.

- [x] T002 [US1] 활동 생성 라우트의 자동 sync 호출 제거 in src/app/api/trips/<id>/days/<dayId>/activities/route.ts (`after(triggerCalendarAutoSync)` 제거, 미사용 import 정리) [artifact: src/app/api/trips/<id>/days/<dayId>/activities/route.ts] [why: autosync-removal] [multi-step: 3]
- [x] T003 [US1] 활동 수정·삭제 라우트의 자동 sync 호출 제거 in src/app/api/trips/<id>/days/<dayId>/activities/<activityId>/route.ts (PUT/PATCH/DELETE) [artifact: src/app/api/trips/<id>/days/<dayId>/activities/<activityId>/route.ts] [why: autosync-removal] [multi-step: 3]
- [x] T004 [P] [US1] 일자·활동 일괄 삭제 라우트의 자동 sync 호출 제거 in src/app/api/trips/<id>/days/batch-delete/route.ts, src/app/api/trips/<id>/activities/batch-delete/route.ts [artifact: src/app/api/trips/<id>/days/batch-delete/route.ts|src/app/api/trips/<id>/activities/batch-delete/route.ts] [why: autosync-removal] [multi-step: 3]
- [x] T005 [P] [US1] 초안 확정(promote) 라우트의 자동 sync 호출 제거 in src/app/api/trips/<id>/drafts/<draftId>/promote/route.ts, src/app/api/trips/<id>/drafts/promote-batch/route.ts [artifact: src/app/api/trips/<id>/drafts/<draftId>/promote/route.ts|src/app/api/trips/<id>/drafts/promote-batch/route.ts] [why: autosync-removal] [multi-step: 3]
- [x] T006 [US1] 자동 반영 미발생 회귀 테스트 추가 in tests/lib/calendar-export-removal.test.ts (활동 CRUD·promote 후 외부 캘린더 쓰기 0건) [artifact: tests/lib/calendar-export-removal.test.ts] [why: regression-guard] [multi-step: 2]
- [x] T007 [US1] 배치 삭제 라우트 테스트의 "자동 반영 1회" assert를 "외부 캘린더 미발생" 가드로 정정 in tests/api/day-batch-delete.test.ts, tests/api/activity-batch-delete.test.ts (auto-sync 함수는 코드 보존 전제로 단위 테스트 calendar-auto-sync.test.ts 유지) [artifact: tests/api/day-batch-delete.test.ts|tests/api/activity-batch-delete.test.ts] [why: regression-guard] [multi-step: 2]

**Checkpoint**: 활동 변경이 외부 캘린더로 전파되지 않는다 (SC-001).

---

## Phase 4: User Story 2 - 가져오기 전용 다이얼로그 (Priority: P1)

**Goal**: 여행 상세에서 내보내기/동기화 진입점을 제거하고 가져오기 전용으로 재구성한다.

**Independent Test**: 캘린더 영역에 쓰기 진입점이 없고 가져오기 진입점·안내만 보임을 확인.

- [x] T008 [US2] CalendarSyncDialog를 가져오기 전용으로 재구성 — ProviderSection(연결/해제 UI) 미렌더 + import/draft 게이트를 external-calendars 연결 상태로 재정의 in src/components/calendar-sync/CalendarSyncDialog.tsx [artifact: src/components/calendar-sync/CalendarSyncDialog.tsx] [why: ui-importonly] [multi-step: 3]
- [x] T009 [P] [US2] ImportSection 렌더 게이트가 export 연결(calendarLinked)이 아닌 external-calendars 상태에 의존하도록 정합 in src/components/calendar-sync/sections/ImportSection.tsx [artifact: src/components/calendar-sync/sections/ImportSection.tsx] [why: ui-importonly] [multi-step: 3]
- [x] T010 [US2] 진입 카드 라벨·카피를 가져오기 전용으로 변경 in src/components/calendar-sync/CalendarSyncEntryCard.tsx (동기화 → 가져오기) [artifact: src/components/calendar-sync/CalendarSyncEntryCard.tsx] [why: ui-importonly] [multi-step: 3]
- [x] T011 [US2] 다이얼로그 컴포넌트 테스트 — 쓰기 진입점 미렌더 + 가져오기 전용 안내 렌더 검증 in tests/components/calendar-sync/CalendarSyncDialog.test.tsx [artifact: tests/components/calendar-sync/CalendarSyncDialog.test.tsx] [why: regression-guard] [multi-step: 2]

**Checkpoint**: 여행 상세 캘린더 영역에 쓰기/동기화 진입점이 0개 (SC-002).

---

## Phase 5: User Story 3 - 가져오기 회귀 없음 (Priority: P2)

**Goal**: 가져오기(import) 흐름이 export 연결 없이도 회귀 없이 동작함을 보증한다.

**Independent Test**: `TripCalendarLink` 부재 상태에서 가져오기 → 초안 → 확정이 정상 동작.

- [x] T012 [US3] 가져오기 독립 인증 회귀 가드 — TripCalendarLink 없이 runImport 호출 가능 + credential 부재 시 미연결 에러 in tests/lib/calendar-import-independence.test.ts [artifact: tests/lib/calendar-import-independence.test.ts] [why: regression-guard] [multi-step: 2]
- [x] T013 [P] [US3] 기존 import·draft 확정 테스트 통과 유지 확인(회귀) in tests/api/drafts-promote-batch.test.ts, tests/components/calendar-sync/DraftSection.test.tsx [artifact: tests/api/drafts-promote-batch.test.ts] [why: regression-guard] [multi-step: 2]

**Checkpoint**: 가져오기 전체 흐름 성공률 변경 전과 동일 (SC-003).

---

## Phase 6: User Story 4 - 쓰기/동기화 API 410 폐지 (Priority: P2)

**Goal**: 외부 캘린더 쓰기·연결·구독 공개 엔드포인트를 410 Gone으로 폐지한다.

**Independent Test**: 폐지 엔드포인트가 410을, 가져오기 엔드포인트가 정상 응답을 반환.

- [x] T014 [US4] sync 엔드포인트 410 Gone 처리 in src/app/api/v2/trips/<id>/calendar/sync/route.ts (레거시 gcal/sync 410 패턴 준용) [artifact: src/app/api/v2/trips/<id>/calendar/sync/route.ts] [why: api-gone] [multi-step: 4]
- [x] T015 [P] [US4] 연결/해제/상태 엔드포인트 410 Gone 처리 in src/app/api/v2/trips/<id>/calendar/route.ts (POST/DELETE/GET) [artifact: src/app/api/v2/trips/<id>/calendar/route.ts] [why: api-gone] [multi-step: 4]
- [x] T016 [P] [US4] Apple trip별 연결 엔드포인트 410 Gone 처리 in src/app/api/v2/trips/<id>/calendar/apple/connect/route.ts (user-level /settings/calendars 등록은 유지) [artifact: src/app/api/v2/trips/<id>/calendar/apple/connect/route.ts] [why: api-gone] [multi-step: 4]
- [x] T017 [P] [US4] 멤버 구독/해제 엔드포인트 410 Gone 처리 in src/app/api/v2/trips/<id>/calendar/subscribe/route.ts (POST/DELETE) [artifact: src/app/api/v2/trips/<id>/calendar/subscribe/route.ts] [why: api-gone] [multi-step: 4]
- [x] T018 [US4] 폐지 엔드포인트 410 + 가져오기 엔드포인트 정상 응답 테스트 in tests/api/calendar-export-gone.test.ts [artifact: tests/api/calendar-export-gone.test.ts] [why: regression-guard] [multi-step: 2]
- [x] T019 [US4] OpenAPI 공개 스펙에 외부 캘린더 쓰기/동기화 표면이 미문서화임을 확인(별도 deprecated 표기 불필요) — 근거 기록 in specs/056-calendar-export-removal/research.md [artifact: specs/056-calendar-export-removal/research.md] [why: docs-openapi]

**Checkpoint**: 외부 캘린더 쓰기 공개 동작 실행 0건 (SC-004).

---

## Phase 7: User Story 5 - 기존 내보낸 항목 안내 (Priority: P3)

**Goal**: trip-planner가 더는 외부 캘린더에 쓰지 않음과 직접 정리 방법을 안내한다.

**Independent Test**: 캘린더 영역 안내 문구 확인 + 활동 삭제 시 외부 항목 잔존.

- [x] T020 [US5] "가져오기 전용 + 기존 항목은 외부 캘린더에서 직접 정리" 안내 카피 추가 in src/components/calendar-sync/CalendarSyncDialog.tsx [artifact: src/components/calendar-sync/CalendarSyncDialog.tsx::ImportOnlyNotice] [why: copy-importonly]

**Checkpoint**: 가져오기 전용 안내 노출 (SC-005), 기존 외부 항목 자동 삭제 없음.

---

## Phase 8: Polish & Cross-Cutting

- [x] T021 용어 정합 — glossary "내보내기/동기화" 항목에 제품 표면 폐지(가져오기 전용) 반영 in docs/glossary.md [artifact: docs/glossary.md] [why: docs-openapi]
- [x] T022 전체 테스트 회귀 — `npx vitest run` 전체 1회 통과 확인 [artifact: tests] [why: regression-guard] [multi-step: 2]
- [ ] T023 릴리즈 노트 단편 작성 (removed 타입) in changes/761.removed.md [artifact: changes/761.removed.md] [why: docs-openapi]

---

## Dependencies & Execution Order

- **US1 (Phase 3)**: 독립. 자동 sync 호출 제거 — MVP 핵심(오염 차단).
- **US2 (Phase 4)**: 독립. UI 재구성. US1과 병행 가능.
- **US3 (Phase 5)**: US2의 게이트 재정의 후 회귀 검증이 자연스러움(논리적 후속). 코드상 독립.
- **US4 (Phase 6)**: 독립. API 410. US1~3과 병행 가능.
- **US5 (Phase 7)**: US2 다이얼로그 위에 안내 카피 추가(같은 파일 → US2 후).
- **Phase 8**: 전 스토리 완료 후.

**병렬 기회**: T004/T005(US1), T009(US2), T015/T016/T017(US4), T013(US3)은 서로 다른 파일이라 [P] 병렬 가능.

## Implementation Strategy

- **MVP**: US1(자동 sync 호출 제거)만으로 신규 오염이 멈춘다 — 1차 가치.
- 이후 US2(표면 정리) → US4(API 폐지) → US3(회귀 가드) → US5(안내) → Polish 순.
- 코드·데이터 보존: sync 코어 함수·export 모델은 삭제하지 않는다.

> T023(단편) 등 towncrier 단편 태스크는 release build가 단편을 소비하므로 `[ ]` 미체크로 유지한다.
