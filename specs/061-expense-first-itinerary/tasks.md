# Tasks: 지출 중심 일정 UX 정비

**Input**: Design documents from `/specs/061-expense-first-itinerary/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/activity-expense.md, quickstart.md

**Tests**: 포함(Vitest 컴포넌트·합산/디폴트 lib).

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

## Phase 1: Setup & Foundational (blocking)

- [ ] T001 schema.prisma — `PaymentTiming { ADVANCE, ON_SITE }` enum + `Activity.paymentTiming`(NOT NULL default ON_SITE) 추가, `Activity.reservationStatus`·`ReservationStatus` enum 제거 in `prisma/schema.prisma` [artifact: prisma/schema.prisma] [why: payment-migration]
- [ ] T002 data-migration — paymentTiming 추가(expand) → 예약상태 보정 백필(RESERVED/REQUIRED/RECOMMENDED→ADVANCE, ON_SITE/NOT_NEEDED/NULL→ON_SITE) → reservation_status 컬럼·타입 DROP(contract) in `prisma/migrations/expense_timing/migration.sql` [artifact: prisma/migrations/expense_timing/migration.sql] [why: payment-migration] [migration-type: data-migration]
- [ ] T003 지출·여행중판정 헬퍼(`isTripInProgress`, 합산 함수 시그니처) in `src/lib/expense.ts` [artifact: src/lib/expense.ts] [why: timing-default]

## Phase 2: US1 — 모바일 간소화 추가 (P1)

**Goal**: 제목·가격·내용 3필드 + 확장. 시간 비강제.
**Independent Test**: 모바일 추가 3필드만 저장 성공, 확장 시 전체 필드.

- [ ] T004 [US1] ActivityForm 간소 모드(모바일 기본 제목·가격·내용 3필드 + "확장" 토글로 전체 필드, 간소 경로 getLocalTimes 자동주입 생략) in `src/components/ActivityForm.tsx` [artifact: src/components/ActivityForm.tsx] [why: quick-add]
- [ ] T005 [P] [US1] 간소 모드 테스트(3필드·시간 비강제 저장·확장 토글) in `tests/components/ActivityForm.test.tsx` [artifact: tests/components/ActivityForm.test.tsx] [why: quick-add]

## Phase 3: US2 — 예약상태 제거 (P1)

**Goal**: 예약상태 입력·표시·참조 전수 제거. 기존 데이터 회귀 0.
**Independent Test**: 추가/편집/상세/카드에 예약상태 부재, 기존 활동 정상.

- [ ] T006 [US2] ActivityForm 예약상태 입력(select) 제거 in `src/components/ActivityForm.tsx` [artifact: src/components/ActivityForm.tsx] [why: remove-reservation]
- [ ] T007 [US2] ActivityCard 예약상태 표시(RESERVATION_LABEL 등) 제거 in `src/components/ActivityCard.tsx` [artifact: src/components/ActivityCard.tsx] [why: remove-reservation]
- [ ] T008 [US2] OpenAPI·활동 API zod 스키마·MCP·문서(CLAUDE.md 예약상태 섹션)의 reservationStatus 참조 제거 in `src/lib/openapi.ts` [artifact: src/lib/openapi.ts] [why: remove-reservation]
- [ ] T009 [P] [US2] 예약상태 부재 단언 테스트 in `tests/components/ActivityCard.test.tsx` [artifact: tests/components/ActivityCard.test.tsx] [why: remove-reservation]

## Phase 4: US3 — 사전/현장 지출 + 디폴트 (P1)

**Goal**: 지출시점 토글 + 맥락 디폴트 + 여행중 주간 뷰.
**Independent Test**: 여행전=사전, 여행중+모바일=현장+주간, 수동 토글.

- [ ] T010 [US3] ActivityForm 지출시점(사전/현장) 토글 + 맥락 디폴트 적용(여행중→ON_SITE, 그외→ADVANCE) in `src/components/ActivityForm.tsx` [artifact: src/components/ActivityForm.tsx] [why: timing-default]
- [ ] T011 [US3] 디폴트 결정 로직(isTripInProgress 기반) in `src/lib/expense.ts` [artifact: src/lib/expense.ts::resolveTimingDefault] [why: timing-default]
- [ ] T012 [US3] 여행중+모바일 주간 달력 디폴트 뷰 in `src/components/trip/CalendarView.tsx` [artifact: src/components/trip/CalendarView.tsx] [why: weekly-default]
- [ ] T013 [P] [US3] 여행중 판정·디폴트·지출시점 토글 테스트 in `tests/lib/expense.test.ts` [artifact: tests/lib/expense.test.ts] [why: timing-default]

## Phase 5: US4 — 금액 합산 (P2)

**Goal**: 여행 총액·일별·사전/현장 소계(통화별).
**Independent Test**: 합산 정확·통화별 구분·cost 없음 0.

- [x] T014 [US4] 합산 함수(여행 총액·일별 합계·사전/현장 소계, 통화별, cost 없음 0) in `src/lib/expense.ts` [artifact: src/lib/expense.ts::summarize] [why: cost-summary]
- [x] T015 [US4] 여행 상세에 총액·일별·소계 표시 in `src/components/trip/TripDetailLayout.tsx` [artifact: src/components/trip/TripDetailLayout.tsx] [why: cost-summary]
- [x] T016 [P] [US4] 합산 테스트(총액·일별·소계·통화별·0기여) in `tests/lib/expense.test.ts` [artifact: tests/lib/expense.test.ts::summary] [why: cost-summary]

## Phase 6: 회귀 가드 & Polish

- [ ] T017 [P] 기존 활동 추가/편집/삭제 흐름 회귀 가드(예약상태 제거 반영) in `tests/components/ActivityList.test.tsx` [artifact: tests/components/ActivityList.test.tsx] [why: regression]
- [ ] T018 [P] towncrier 단편(지출 중심 UX, 도메인 추상화·합쇼체) in `changes/807.feat.md` [artifact: changes/807.feat.md] [why: regression]

## Dependencies

- **Phase 1(T001~T003)**: 전 스토리 선행. T001→T002(스키마→마이그레이션). T003 lib는 US3/US4 선행.
- **US1·US2·US3**는 ActivityForm을 공유 → 같은 파일 순차(T004→T006→T010) 권장, 테스트는 병행.
- **US4**는 T003·T014 위에. **회귀**는 독립.

## Parallel 예시

- 테스트 T005/T009/T013/T016/T017 [P]는 파일 분산 → 병행.
- T018 [P] 단편 병행.

## Implementation Strategy

- **MVP = US1+US2+US3**(P1): 간소 추가 + 예약상태 제거 + 사전/현장. 핵심 가치.
- US4(합산) 이어서. 회귀·단편 마무리.
- feature(061) → develop PR. 마이그레이션은 Vercel preview(neondb_dev)에서 검증.
