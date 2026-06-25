# Tasks: 여행 종합정보 — 목록 금액·인원 + 개요

**Input**: Design documents from `/specs/063-trip-overview/`
**Prerequisites**: plan.md, spec.md, data-model.md, quickstart.md

**Tests**: 포함(Vitest — 개요 표시·요약).

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

## Phase 1: US1 — 목록 카드 금액·인원 (P1)

**Goal**: 목록 카드에 지출 합계(+원화 근사)·인원수.
**Independent Test**: 지출·동행자 있는 여행 카드에 금액·인원 노출.

- [x] T001 [US1] 목록 서버 집계 — 인원 `_count.tripMembers` + trip별 지출 일괄 조회 + 환율 배치(원화 근사) in `src/app/trips/page.tsx` [artifact: src/app/trips/page.tsx] [why: list-summary]
- [x] T002 [US1] 카드 UI에 사용 금액(현화/원화 참고)·인원수 표시, 지출 0이면 금액 생략 in `src/app/trips/page.tsx` [artifact: src/app/trips/page.tsx] [why: list-summary]

## Phase 2: US2 — 여행 개요 섹션 (P1)

**Goal**: 기간·인원·총액·설명을 한 자리. 설명 없어도 종합정보 노출. 일정 메인 유지.
**Independent Test**: 상세에서 개요가 기간·인원·총액(+설명)을 보인다.

- [x] T003 [US2] 여행 개요 컴포넌트(기간·인원·총액·설명, 설명 없으면 종합정보만) in `src/components/trip/TripInfoDisclosure.tsx` [artifact: src/components/trip/TripInfoDisclosure.tsx] [why: trip-overview]
- [x] T004 [US2] 상세 페이지가 개요에 인원·기간·총액·설명 전달(일정 메인 유지) in `src/app/trips/<id>/page.tsx` [artifact: src/app/trips/<id>/page.tsx] [why: trip-overview]
- [x] T005 [P] [US2] 개요 표시 테스트(설명 유무·인원·총액·일정 비대체) in `tests/components/trip/TripInfoDisclosure.test.tsx` [artifact: tests/components/trip/TripInfoDisclosure.test.tsx] [why: trip-overview]

## Phase 3: 회귀 가드 & Polish

- [x] T006 [P] 총액·설명 미전달 시 안전 렌더(기존 표시 유지) 회귀 가드 in `tests/components/trip/TripInfoDisclosure.test.tsx` [artifact: tests/components/trip/TripInfoDisclosure.test.tsx] [why: regression]

## Dependencies

- **US1(T001→T002)**: 같은 파일 순차(집계→표시).
- **US2**: T003(컴포넌트)→T004(연결). T005 [P] 테스트 병행.
- **회귀(T006)**는 독립.

## Implementation Strategy

- **MVP = US1**(목록 금액·인원) — 가장 자주 보는 화면.
- US2(개요) 이어서 — 기존 `tripSummary`/`tripKrw` + 인원수만 더해 컴포넌트로 묶음.
- feature(063) → develop PR. 스키마 변경 없음.
- 기존 `summarize`/`convertToKrw`/`getRatesForPairs`/`ExpenseSummary` 재사용.
