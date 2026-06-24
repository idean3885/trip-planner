# Implementation Plan: 지출 중심 일정 UX 정비

**Branch**: `061-expense-first-itinerary` | **Date**: 2026-06-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/061-expense-first-itinerary/spec.md`

## Summary

여행 중 지출을 한 줄로 빠르게 남기게 하고, 과한 예약상태 입력을 걷어내며, 지출을 사전/현장으로 구분해 총액·일별·소계로 보여준다. 모바일 일정 추가는 제목·가격·내용 3필드 기본 + 확장. `Activity.reservationStatus`(enum 5값)는 제거하고, 신규 `paymentTiming`(ADVANCE | ON_SITE)을 추가한다. 마이그레이션은 expand-and-contract: 컬럼 추가 → 기존 예약상태에서 지출시점 보정 백필 → 예약상태 컬럼 DROP(데이터 마이그레이션). 여행 중(오늘∈여행기간)+모바일이면 주간 달력 디폴트·현장 디폴트, 여행 전이면 사전 디폴트. 합산은 활동 cost를 통화별로 집계(임의 환산 없음). 카테고리·floating-time은 유지, 데스크탑 회귀 없음.

## Coverage Targets

- 예약상태 입력·표시·참조 일괄 제거(폼·카드·OpenAPI·MCP·문서) [why: remove-reservation] [multi-step: 3]
- 지출시점 컬럼 추가 + 예약상태→지출시점 보정 백필 + 예약상태 컬럼 DROP 마이그레이션 [why: payment-migration] [multi-step: 2]
- 모바일 간소화 추가 폼(제목·가격·내용 3필드 + 확장, 시간 비강제) [why: quick-add] [multi-step: 2]
- 사전/현장 디폴트 로직(여행중 판정 + 모바일 현장 / 여행전 사전) [why: timing-default] [multi-step: 2]
- 여행중+모바일 주간 달력 디폴트 [why: weekly-default]
- 금액 합산(여행 총액·일별 + 사전/현장 소계, 통화별 구분) [why: cost-summary] [multi-step: 2]
- 회귀 가드(데스크탑 전체 폼·기존 조회·기존 예약상태 보유 활동) [why: regression]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (Next.js 16 App Router, React 19) · Python 3.10+ (MCP)  
**Primary Dependencies**: Next.js 16, Prisma 7(@prisma/adapter-pg, Neon), Tailwind v4, shadcn/ui(vendored), embla-carousel(주간/캘린더). **신규 의존성 도입 없음**.  
**Storage**: Neon Postgres (Production `neondb` / Preview·Dev `neondb_dev`, #318). Prisma 마이그레이션 1건(**data-migration** — 컬럼 추가+백필+DROP).  
**Testing**: Vitest(폼·카드·합산·디폴트), pytest(MCP 영향분).  
**Target Platform**: 모바일 웹 우선(여행 중 현장 입력), 데스크탑 회귀 없음.  
**Project Type**: 웹앱(Next.js) + MCP/OpenAPI 동반.  
**Performance Goals**: 간소 추가는 제목·가격·내용 입력 즉시 저장(시간 0회). 합산은 화면 내 즉시 반영.  
**Constraints**: floating-time·통화 모델 유지. 예약상태 제거는 회귀 0(기존 활동 조회·편집 유지). 통화 혼재 시 임의 환산 금지.  
**Scale/Scope**: 1인+동행 소수. 활동 컬럼 1 추가/1 제거, 폼·카드·합산 UI, 디폴트 로직, OpenAPI·MCP 정리.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. AX-First** ✅ — API/MCP로도 동일 데이터(지출시점 포함, 예약상태 제거)를 다룰 수 있게 OpenAPI·MCP 동반 정리.
- **II. Minimum Cost** ✅ — 신규 인프라·의존성 없음. 합산은 기존 데이터 집계.
- **III. Mobile-First Delivery** ✅ — 본 피처의 본질. 간소 추가·주간 디폴트·현장 디폴트 모두 모바일 현장 사용 최적화.
- **IV. Incremental Release** ✅ — 데스크탑·기존 조회 회귀 없음. 예약상태 제거는 expand-and-contract로 안전 단계화.
- **V. Cross-Domain Integrity** ✅ — 일정 편성 도메인 내부(Activity 소유). 합산은 조회 집계.
- **VI. Role-Based Access Control** ✅ — 추가/편집은 기존 편집 권한(OWNER/HOST) 매트릭스 그대로. 신규 행위 없음(필드 변경).
- **VII. Calendar Time Model** ✅ — 시간 비강제로 두되 입력 시 부동 시간 그대로. 관찰자 환산 없음.

**위반 없음** — Complexity Tracking 불필요.

## Project Structure

### Documentation (this feature)

```text
specs/061-expense-first-itinerary/
├── plan.md · research.md · data-model.md · quickstart.md
├── contracts/activity-expense.md
└── tasks.md   # /speckit.tasks
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                              # - reservationStatus/ReservationStatus, + paymentTiming/PaymentTiming
└── migrations/<ts>_expense_timing/migration.sql   # [migration-type: data-migration] 추가+백필+DROP

src/
├── components/
│   ├── ActivityForm.tsx        # 간소 모드(제목·가격·내용+확장), 예약상태 제거, 지출시점 토글
│   ├── ActivityCard.tsx        # 예약상태 표시 제거, 지출시점/가격 표기
│   └── trip/
│       ├── DayActivitiesPane.tsx   # 일별 합계 표시
│       ├── TripDetailLayout.tsx    # 여행 총액·사전/현장 소계, 여행중+모바일 주간 디폴트
│       └── CalendarView.tsx        # 주간 디폴트 뷰 적용
├── lib/
│   ├── expense.ts              # 합산(총액·일별·사전/현장, 통화별) + 여행중 판정·디폴트 헬퍼
│   └── openapi.ts              # reservationStatus 제거, paymentTiming 반영
└── app/api/...                 # 활동 API 스키마(zod 등) reservationStatus→paymentTiming

mcp/trip_mcp/**                 # reservationStatus 참조 정리(있으면)

tests/
├── components/ActivityForm.test.tsx·ActivityCard.test.tsx   # 간소 모드·예약상태 부재
├── lib/expense.test.ts                                       # 합산·디폴트
└── api/...                                                   # 스키마 회귀
```

**Structure Decision**: 기존 웹앱 구조 유지. 합산·여행중판정·디폴트는 `src/lib/expense.ts`로 모아 폼·레이아웃이 공유한다. 마이그레이션은 단일 파일에서 expand(추가)→백필→contract(DROP)를 순서대로 수행하고 `[migration-type: data-migration]` 헤더를 둔다.

## Complexity Tracking

> 위반 없음 — 비움.
