---

description: "Task list for 058-activity-card-url-refine"
---

# Tasks: 여행 상세 활동 카드·URL 필드·폼 반응형·가져오기 정보구조 정비

**Input**: Design documents from `/specs/058-activity-card-url-refine/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: 포함(레포 테스트 문화 — CI 회귀 가드).

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

## Phase 1: Setup

(신규 의존성·구조 없음 — 생략)

## Phase 2: Foundational

- [x] T001 [P] Activity 모델에 `url String?` 추가 in prisma/schema.prisma [artifact: prisma/schema.prisma] [why: activity-url-schema] [multi-step: 2]
- [x] T002 schema-only 마이그레이션 SQL 작성(헤더 포함) in prisma/migrations/20260605120000_add_activity_url/migration.sql [artifact: prisma/migrations/20260605120000_add_activity_url/migration.sql] [why: activity-url-schema] [multi-step: 2] [migration-type: schema-only]

## Phase 3: User Story 1 - 선택 날짜 일정 정돈 (P1)

**Goal**: 보더 없는 활동 카드 + 빈 상태 카드 + 적정 하단 여백(접힘 스크롤 유지).
**Independent Test**: 빈 날·적은 날 모바일에서 보더 박스 없음·빈 안내 카드·여백 축소·스크롤 접힘 확인.

- [x] T003 [US1] DayActivitiesPane 컨테이너 Card 보더·배경 제거(활동 카드만), dayId 없음 빈 상태도 카드로, 로딩 스켈레톤 구분 유지 in src/components/trip/DayActivitiesPane.tsx [artifact: src/components/trip/DayActivitiesPane.tsx] [why: panel-borderless]
- [x] T004 [P] [US1] ActivityList 활동 0건 빈 상태 안내 카드 추가(추가 버튼 유지) in src/components/ActivityList.tsx [artifact: src/components/ActivityList.tsx] [why: empty-state-card]
- [x] T005 [US1] TripDetailLayout 모바일 하단 min-height 축소(100svh→적정 svh) in src/components/trip/TripDetailLayout.tsx [artifact: src/components/trip/TripDetailLayout.tsx] [why: bottom-spacing] [multi-step: 2]
- [x] T006 [US1] TripDetailLayout 스크롤 클램프 가드 — 문서가 뷰포트보다 짧아 스크롤 불가일 때 scrollY≈0을 무시(접힘 후 재펼침 플립 방지) in src/components/trip/TripDetailLayout.tsx [artifact: src/components/trip/TripDetailLayout.tsx] [why: bottom-spacing] [multi-step: 2]
- [x] T007 [P] [US1] 테스트: 컨테이너 보더 부재·여백 축소값·클램프 가드(짧은 문서 펼침 안 함) in tests/components/trip/TripDetailLayout.test.tsx [artifact: tests/components/trip/TripDetailLayout.test.tsx] [why: bottom-spacing] [multi-step: 2]
- [x] T008 [P] [US1] 테스트: ActivityList 0건 빈 상태 카드 렌더 in tests/components/ActivityList.test.tsx [artifact: tests/components/ActivityList.test.tsx] [why: empty-state-card]
- [x] T009 [P] [US1] 테스트: DayActivitiesPane 보더 부재·빈 상태/로딩 구분 in tests/components/trip/DayActivitiesPane.test.tsx [artifact: tests/components/trip/DayActivitiesPane.test.tsx] [why: panel-borderless]

## Phase 4: User Story 3 - 활동 URL 항목 (P1)

**Goal**: 메모와 분리된 url을 폼·카드·상세·API·MCP·OpenAPI에 일관 노출.
**Independent Test**: url 입력→저장→카드 링크·API 응답·도구 표현 포함, 미입력 미표시, 기존 메모 보존.

- [x] T010 [US3] activities POST/PATCH(목록) url Zod 입출력 + 빈 문자열 null 정규화 in `src/app/api/trips/<id>/days/<dayId>/activities/route.ts` [artifact: src/app/api/trips/<id>/days/<dayId>/activities/route.ts] [why: activity-url-contract] [multi-step: 2]
- [x] T011 [US3] activity 단건 PATCH url 입출력 in `src/app/api/trips/<id>/days/<dayId>/activities/<activityId>/route.ts` [artifact: src/app/api/trips/<id>/days/<dayId>/activities/<activityId>/route.ts] [why: activity-url-contract] [multi-step: 2]
- [x] T012 [P] [US3] OpenAPI activity 스키마에 url(nullable) in src/lib/openapi.ts [artifact: src/lib/openapi.ts] [why: activity-url-contract] [multi-step: 2]
- [x] T013 [P] [US3] MCP planner 활동 생성/수정/표현에 url in mcp/trip_mcp/planner.py [artifact: mcp/trip_mcp/planner.py] [why: activity-url-contract] [multi-step: 2]
- [x] T014 [US3] ActivityForm 메모·장소와 구분된 url 입력 칸 in src/components/ActivityForm.tsx [artifact: src/components/ActivityForm.tsx] [why: activity-url-ui] [multi-step: 2]
- [x] T015 [US3] ActivityCard url 있을 때만 클릭 링크(긴 url break) in src/components/ActivityCard.tsx [artifact: src/components/ActivityCard.tsx] [why: activity-url-ui] [multi-step: 2]
- [x] T016 [P] [US3] 테스트: url 입력→응답 포함·빈문자열 null·카드 링크/미표시 in tests/components/ActivityCard.test.tsx, tests/api/activities.test.ts [artifact: tests/components/ActivityCard.test.tsx|tests/api/activities.test.ts] [why: activity-url-ui] [multi-step: 2]

## Phase 5: User Story 2 - 메모 클램프 (P2)

**Goal**: 목록 카드 메모 3줄+말줄임, 상세 전문.
**Independent Test**: 긴 메모 카드 3줄·상세 전문.

- [x] T017 [US2] ActivityCard 목록 메모 line-clamp-3 적용(상세 전문 유지) in src/components/ActivityCard.tsx [artifact: src/components/ActivityCard.tsx] [why: memo-clamp]
- [x] T018 [P] [US2] 테스트: 메모 line-clamp-3 클래스 단언 in tests/components/ActivityCard.test.tsx [artifact: tests/components/ActivityCard.test.tsx] [why: memo-clamp]

## Phase 6: User Story 4 - 폼 320px 반응형 (P2)

**Goal**: 320px에서 시작·종료 입력 겹침 해소, 넓은 화면 회귀 없음.
**Independent Test**: 320px 폭 폼 시작·종료 비겹침.

- [x] T019 [US4] ActivityForm 시작·종료 grid-cols-2 → 좁은 폭 1열 반응형 in src/components/ActivityForm.tsx [artifact: src/components/ActivityForm.tsx] [why: form-responsive]
- [x] T020 [P] [US4] 테스트: 시작·종료 반응형 클래스 단언 in tests/components/ActivityForm.test.tsx [artifact: tests/components/ActivityForm.test.tsx] [why: form-responsive]

## Phase 7: User Story 5 - 가져오기 provider 섹션 (P3)

**Goal**: 가져오기 화면 애플·구글 제목 섹션 분리.
**Independent Test**: 두 provider 섹션 제목 각각 노출.

- [x] T021 [US5] ImportSection 애플·구글 제목 섹션 분리(각 영역이 자기 연결·미연결·목록 표시) in src/components/calendar-sync/sections/ImportSection.tsx [artifact: src/components/calendar-sync/sections/ImportSection.tsx] [why: import-provider-sections]
- [x] T022 [P] [US5] 테스트: 애플·구글 섹션 제목 렌더 in tests/components/calendar-sync/import-section-provider.test.tsx [artifact: tests/components/calendar-sync/import-section-provider.test.tsx] [why: import-provider-sections]

## Phase 8: Polish & Cross-Cutting

- [x] T023 전체 테스트 회귀 — `npx vitest run` 1회 통과 + typecheck + 변경 파일 prettier/eslint [artifact: tests] [why: bottom-spacing] [multi-step: 2]

## Dependencies

- Phase 2(스키마)는 US3(T010~T016)의 선행. US1·US2·US4·US5는 스키마와 독립.
- US 간 독립 — 우선순위 P1(US1·US3) → P2(US2·US4) → P3(US5).
- 같은 파일(ActivityCard: T015·T017, ActivityForm: T014·T019)은 순차 처리, [P] 아님.

## MVP

US1 + US3(P1) = 핵심 정돈 + URL 항목. 나머지는 점증.
