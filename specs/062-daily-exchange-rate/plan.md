# Implementation Plan: 원화 자동 근사 환산 (참고용 현화/한화 병기)

**Branch**: `062-daily-exchange-rate` | **Spec**: [spec.md](./spec.md)

## Summary

여행자 입력 없이 시스템이 일자·통화 근사 시세를 자동 확보·캐시하고, 일별 합산과 여행 총액을 현화 옆에 "약 …원 (참고)"으로 병기한다. 현화 원본이 정본이며 원화는 표시 시점 환산 참고치다. 직전 피처(spec 061)의 금액 합산을 확장한다.

## Coverage Targets

- 근사 환율 자동 확보 + 캐시 재사용(외부 공개 일별 시세, 통화·일자당 사실상 1회) [why: fx-source] [multi-step: 2]
- 근사 환율 캐시 보관소 1건 추가(마이그레이션) [why: fx-store]
- 원화 환산 합산 로직(일자별 근사 환율 적용 + 부분 반영 판정 + 원화분 가산) [why: krw-convert] [multi-step: 2]
- 일별·총액 현화/원화 병기 표시(참고 라벨, 미확보 통화 생략) [why: krw-display] [multi-step: 2]
- 회귀 가드(환율 미확보 시 현화만, 기존 합산 표시 유지) [why: regression]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (Next.js 16 App Router, React 19)  
**Primary Dependencies**: Next.js 16, Prisma 7(@prisma/adapter-pg, Neon), Tailwind v4, shadcn/ui(vendored). 외부 시세는 무료·무인증 공개 엔드포인트(ECB 기반 일별 환율, 예: Frankfurter)를 서버에서 호출. **신규 npm 의존성 도입 없음**(fetch 사용).  
**Storage**: Neon Postgres (Production `neondb` / Preview·Dev `neondb_dev`, #318). Prisma 마이그레이션 1건(**schema-only** — 환율 캐시 테이블 신설, 백필 없음).  
**Testing**: Vitest(환율 확보·캐시·환산·표시). 외부 호출은 mock.  
**Target Platform**: 모바일 웹 우선. 데스크탑 회귀 없음.  
**Project Type**: 웹앱(Next.js). MCP/OpenAPI 영향 없음(읽기 표시 전용).  
**Performance Goals**: 트립 조회 시 필요한 (일자,통화) 시세는 캐시 우선, 미스만 외부 호출. 외부 호출 실패는 현화-only로 graceful.  
**Constraints**: 원화 값은 참고 근사(정산 정확값 아님). 현화 원본 정본 유지. 미확보분 추정 금지. 헌법 II(무료·무인증 시세, 캐시로 호출 억제).  
**Scale/Scope**: 1인+동행 소수, 통화 대개 1~3. 캐시 테이블 1, 환율 lib 1, 환산 로직 + 표시 확장.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. AX-First** ✅ — 표시 전용 참고 기능. API/MCP 데이터 계약 변경 없음(현화 원본 그대로).
- **II. Minimum Cost** ✅ — 무료·무인증 공개 시세 + DB 캐시로 외부 호출을 통화·일자당 1회 수준으로 억제. 신규 의존성·유료 인프라 없음.
- **III. Mobile-First Delivery** ✅ — 입력 0의 자동 병기로 현장에서 원화 감을 즉시 제공.
- **IV. Incremental Release** ✅ — 캐시 테이블 신설(schema-only, 백필 없음). 환율 미확보 시 기존 합산 표시 그대로 → 회귀 0.
- **V. Cross-Domain Integrity** ✅ — 환율 캐시는 표시 보조 데이터. 활동·금액 정본 불변.
- **VI. Role-Based Access Control** ✅ — 환율 입력·편집 동작 없음(자동). 조회 표시만 — 기존 조회 권한 그대로.
- **VII. Calendar Time Model** ✅ — 일자 기준은 활동의 달력일(부동 시간 관행). 관찰자 환산 없음.

**위반 없음** — Complexity Tracking 불필요.

## Project Structure

### Documentation (this feature)

```
specs/062-daily-exchange-rate/
├── spec.md
├── plan.md
├── data-model.md
├── quickstart.md
├── tasks.md
└── checklists/requirements.md
```

### Source Code (repository root)

```
src/lib/fx/rates.ts                       # 근사 환율 확보 + 캐시 (신규)
src/lib/expense.ts                        # convertToKrw 추가 (확장)
src/components/trip/ExpenseSummary.tsx    # 원화 병기 표시 (확장)
src/components/trip/DayActivitiesPane.tsx # 일별 원화 병기 (확장)
src/components/trip/TripDetailLayout.tsx  # rateMap·tripKrw 전달 (확장)
src/app/trips/[id]/page.tsx               # 서버에서 rateMap·총액 원화 산출 (확장)
prisma/schema.prisma                      # ExchangeRate 모델 (확장)
prisma/migrations/<ts>_add_exchange_rate_cache/migration.sql  # schema-only (신규)
tests/lib/fx/rates.test.ts                # 확보·캐시·실패 (신규)
tests/lib/expense.test.ts                 # convertToKrw (확장)
tests/components/trip/ExpenseSummary.test.tsx  # 원화 병기·참고 라벨 (확장)
```

## Complexity Tracking

해당 없음(헌법 위반 없음).
