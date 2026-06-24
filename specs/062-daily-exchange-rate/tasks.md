# Tasks: 원화 자동 근사 환산 (참고용 현화/한화 병기)

**Input**: Design documents from `/specs/062-daily-exchange-rate/`
**Prerequisites**: plan.md, spec.md, data-model.md, quickstart.md

**Tests**: 포함(Vitest — 환율 확보·캐시·환산·표시).

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

## Phase 1: 환율 확보·캐시 (Foundational)

- [x] T001 ExchangeRate 보관소 모델 추가(`(date, base)` 유니크, `rateToKrw`) in `prisma/schema.prisma` [artifact: prisma/schema.prisma] [why: fx-store]
- [x] T002 환율 캐시 보관소 마이그레이션(신규 테이블, 백필 없음) in `prisma/migrations/20260624010000_add_exchange_rate_cache/migration.sql` [artifact: prisma/migrations/20260624010000_add_exchange_rate_cache/migration.sql] [why: fx-store] [migration-type: schema-only]
- [x] T003 [P] 근사 환율 확보 모듈(캐시 우선 → 미스 시 외부 일별 시세 호출 → upsert, 실패 시 null, KRW=1) in `src/lib/fx/rates.ts` [artifact: src/lib/fx/rates.ts] [why: fx-source]
- [x] T004 [P] 환율 확보·캐시·실패 테스트(캐시 적중 시 외부 호출 0, 미스 1회, 실패 null) in `tests/lib/fx/rates.test.ts` [artifact: tests/lib/fx/rates.test.ts] [why: fx-source]

## Phase 2: US1·US2 — 원화 환산 합산 (P1)

**Goal**: 일자별 근사 환율로 현화를 원화 근사로 환산·합산.
**Independent Test**: 가짜 시세 맵으로 환산 합·부분 반영 판정 검증.

- [x] T005 [US1] 원화 환산 합산 함수(일자별 환율 적용·KRW 가산·미확보 제외·partial 판정) in `src/lib/expense.ts` [artifact: src/lib/expense.ts::convertToKrw] [why: krw-convert]
- [x] T006 [P] [US1] 환산 합산 테스트(다일자·다통화 합·KRW 혼재·미확보 partial) in `tests/lib/expense.test.ts` [artifact: tests/lib/expense.test.ts::krw] [why: krw-convert]

## Phase 3: US1·US2 — 현화/원화 병기 표시 (P1)

**Goal**: 일별 합산·여행 총액에 "약 …원 (참고)" 병기. 미확보 통화 생략.
**Independent Test**: ExpenseSummary가 원화 prop을 참고 라벨과 함께 렌더, 미전달 시 현화-only.

- [x] T007 [US1] ExpenseSummary 원화 병기(참고 라벨, partial 고지) in `src/components/trip/ExpenseSummary.tsx` [artifact: src/components/trip/ExpenseSummary.tsx] [why: krw-display]
- [x] T008 [US2] 서버 rateMap·총액 원화 산출 + 레이아웃/패널 전달(일별 원화) in `src/app/trips/<id>/page.tsx` [artifact: src/app/trips/<id>/page.tsx] [why: krw-display]
- [x] T009 [P] [US1] 원화 병기·참고 라벨·미확보 생략 표시 테스트 in `tests/components/trip/ExpenseSummary.test.tsx` [artifact: tests/components/trip/ExpenseSummary.test.tsx] [why: krw-display]

## Phase 4: 회귀 가드 & Polish

- [x] T010 [P] 환율 미전달 시 기존 현화-only 합산 유지 회귀 가드 in `tests/components/trip/ExpenseSummary.test.tsx` [artifact: tests/components/trip/ExpenseSummary.test.tsx] [why: regression]

## Dependencies

- **Phase 1**: T001→T002(모델→마이그레이션). T003은 T001 위. T003·T004 [P] 병행 가능.
- **US1·US2 환산(T005)**은 T003(확보) 위. 표시(T007·T008)는 T005 위.
- **회귀(T010)**는 독립.

## Implementation Strategy

- **MVP = US1**(P1): 일별 합산 원화 자동 병기. 핵심 가치.
- US2(총액 병기) 이어서 — 같은 환산 토대 공유.
- feature(062) → develop PR. 마이그레이션은 Vercel preview(neondb_dev)에서 검증.
- 외부 시세 미도달 환경(샌드박스)에서는 null→현화-only로 graceful, 테스트는 mock.
