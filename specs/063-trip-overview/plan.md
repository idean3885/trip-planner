# Implementation Plan: 여행 종합정보 — 목록 금액·인원 + 개요

**Branch**: `063-trip-overview` | **Spec**: [spec.md](./spec.md)

## Summary

여행 목록 카드에 지출 합계(현화 + 원화 근사 참고)와 동행자 인원수를 더하고, 여행 상세에 기간·인원·총액·설명을 한 자리에 모은 "여행 개요" 섹션을 둔다(일정 캘린더는 메인 유지). 기존 합산(`summarize`/`convertToKrw`)·환율(`getRatesForPairs`)·동행자 데이터를 재사용하며 **스키마 변경 없음**(읽기 파생).

## Coverage Targets

- 목록 카드에 지출 합계(+원화 근사 참고)·인원수 표시 [why: list-summary] [multi-step: 2]
- 여행 상세 개요 섹션(기간·인원·총액·설명, 설명 없어도 종합정보 노출, 일정 메인 유지) [why: trip-overview] [multi-step: 2]
- 회귀 가드(기존 목록·상세 표시 유지) [why: regression]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (Next.js 16 App Router, React 19)  
**Primary Dependencies**: Next.js 16, Prisma 7(@prisma/adapter-pg, Neon), Tailwind v4, shadcn/ui(vendored). **신규 의존성 없음**.  
**Storage**: Neon Postgres. **마이그레이션 0건** — 기존 여행·일정·활동(지출)·동행자에서 집계만 한다.  
**Testing**: Vitest(개요 컴포넌트·요약 표시). 외부 호출(환율)은 기존대로 mock.  
**Target Platform**: 모바일 웹 우선.  
**Project Type**: 웹앱(Next.js).  
**Performance Goals**: 목록은 trip별 N+1을 피해 일괄 집계(_count + 활동 일괄 조회 + 환율 배치). 표시 지연 체감 없음.  
**Constraints**: 원화는 참고 근사(기존 정책). 일정 캘린더 메인 불변. 읽기 전용(입력 추가 없음).  
**Scale/Scope**: 1인+동행 소수, 여행 수 수~수십. 목록 페이지·상세 페이지·개요 컴포넌트 1.

## Constitution Check

- **I. AX-First** ✅ — 표시 전용. API/데이터 계약 변경 없음.
- **II. Minimum Cost** ✅ — 신규 인프라·의존성·테이블 없음. 기존 집계 재사용. 목록 환율은 캐시 우선.
- **III. Mobile-First Delivery** ✅ — 목록·상세 모두 모바일에서 한눈에 규모·맥락 파악.
- **IV. Incremental Release** ✅ — 추가 표시만. 기존 일정·목록 동작 회귀 0.
- **V. Cross-Domain Integrity** ✅ — 여행·일정·지출·동행자 읽기 집계. 정본 불변.
- **VI. Role-Based Access Control** ✅ — 본인이 속한 여행만 조회(기존 권한 그대로). 신규 동작 없음.
- **VII. Calendar Time Model** ✅ — 기간은 기존 derived 기간 규칙. 환율 일자는 기존 규칙 승계.

**위반 없음** — Complexity Tracking 불필요.

## Project Structure

### Documentation (this feature)

```
specs/063-trip-overview/
├── spec.md
├── plan.md
├── data-model.md
├── quickstart.md
├── tasks.md
└── checklists/requirements.md
```

### Source Code (repository root)

```
src/app/trips/page.tsx                      # 목록: 인원 _count + 지출 일괄 집계 + 카드 표시 (확장)
src/components/trip/TripInfoDisclosure.tsx    # 여행 개요(기간·인원·총액·설명) (신규)
src/app/trips/[id]/page.tsx                 # 상세: 개요 섹션 연결(인원·기간·총액·설명 전달) (확장)
tests/components/trip/TripInfoDisclosure.test.tsx  # 개요 표시·회귀 (신규)
```

재사용: `src/lib/expense.ts`(`summarize`/`convertToKrw`), `src/lib/fx/rates.ts`(`getRatesForPairs`), `src/components/trip/ExpenseSummary.tsx`.

## Complexity Tracking

해당 없음(헌법 위반 없음).
