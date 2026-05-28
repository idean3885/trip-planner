# Implementation Plan: 여행 상세·목록 2분할 캘린더 레이아웃 + 연속 일자 가로 bar

**Branch**: `031-split-calendar-layout` | **Date**: 2026-05-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/031-split-calendar-layout/spec.md`

## Summary

데스크탑(≥ 1024px) 에서 `/trips/[id]` 본문 grid 를 `2fr+1fr` → `1fr+1fr` 로 변경하고 가운데 영역(트립 체크박스 · 선택 날짜 일정 패널 · placeholder · "+ 일정 추가") 을 제거한다. `/trips` 목록은 좌측에 사용자의 모든 trip 일자를 표시하는 통합 캘린더 + 우측 카드 목록 grid 로 재구성한다. `CalendarView` 셀 렌더링에 연속 일자 가로 bar 를 추가하고, 셀 클릭은 상세에서 Day 페이지로, 목록에서 trip 상세로 라우팅한다.

## Coverage Targets

- /trips/[id] 본문 2 분할 grid + 가운데 영역 제거 [why: split-layout-detail] [multi-step: 2]
- /trips 좌측 통합 캘린더 + 우측 카드 목록 [why: split-layout-list] [multi-step: 2]
- CalendarView 연속 일자 가로 bar 렌더링 [why: cell-bar] [multi-step: 2]
- 상세 캘린더 셀 → Day 페이지 라우팅 + 빈 셀 비활성 [why: cell-routing-detail]
- 목록 통합 캘린더 셀 → trip 상세 라우팅 (충돌 시 가까운 미래 trip) [why: cell-routing-list] [multi-step: 2]
- 사용자 모든 trip 일자 통합 데이터 공급 [why: unified-calendar-feed]
- 단편 / 검증 / 회귀 [why: release-bookkeeping]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+  
**Primary Dependencies**: Next.js 16 (App Router, Turbopack), React 19, Prisma 7 (Neon Postgres adapter), Tailwind CSS v4 (`@theme` CSS-first), shadcn/ui (vendored), lucide-react. **신규 의존성 도입 없음**.  
**Storage**: Neon Postgres — **스키마 변경 없음**. 기존 `Trip` / `Day` / `TripCalendarLink` / `TripMember` 참조만.  
**Testing**: 수동 시각 검증(브라우저 ≥ 1024px / < 1024px). 자동 회귀는 Playwright 또는 Vitest 도입 시 후속.  
**Target Platform**: 데스크탑 브라우저(viewport ≥ 1024px) 중심. 모바일(< 1024px) 은 기존 stacked 흐름 유지.  
**Project Type**: Web application (Next.js 단일 프로젝트, `src/` + `mcp/`)  
**Performance Goals**: 캘린더 초기 렌더 ≤ 200ms (사용자 체감 즉시). 통합 캘린더용 trip 일자 fetch 는 SSR 단계에 1 회 수행.  
**Constraints**: 데이터 스키마 변경 0 건. 신규 패키지 도입 0 건. 모바일 회귀 0 건.  
**Scale/Scope**: 한 사용자 평균 trip 수 ≤ 10 가정. 통합 캘린더 일자 합산 ≤ 200 일 가정 — DOM 부담 미미.

## Constitution Check

본 프로젝트의 헌법은 `.specify/memory/constitution.md` 가 있다면 그쪽 따름. UI 전용 변경이라 V (마이그레이션 expand-and-contract) · VI (데이터 정본) 게이트 모두 해당 없음. CSS 토큰은 spec 012 의 `@theme` 정본 그대로 사용.

## Project Structure

### Documentation (this feature)

```text
specs/031-split-calendar-layout/
├── plan.md
├── spec.md
├── tasks.md
├── quickstart.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── trips/
│   │   ├── page.tsx              # /trips 목록 — 좌측 통합 캘린더 + 우측 카드 목록 grid 재구성
│   │   └── [id]/
│   │       ├── page.tsx          # /trips/[id] 상세 — 본문 grid 1fr+1fr + 가운데 영역 제거
│   │       └── SidePanel.tsx     # (기존) 우측 외부 캘린더 + 동행자 카드
│   └── ...
├── components/
│   └── trip/
│       ├── TripDetailLayout.tsx  # 가운데 sidePane·MobileSwipeShell 제거, 캘린더 + 외 동선 단순화
│       ├── CalendarView.tsx      # 셀 렌더에 연속 일자 가로 bar 추가
│       ├── TripsCalendar.tsx     # (신규) /trips 목록용 통합 캘린더 wrapper
│       └── DayActivitiesPane.tsx # 본 피처에서 사용 안 함 (코드는 유지 — 후속에서 재배치 검토)
└── lib/
    └── ...
```

**Structure Decision**: 단일 Next.js 프로젝트 구조 유지. 신규 컴포넌트는 `src/components/trip/TripsCalendar.tsx` 하나 추가하고 그 외는 기존 파일 수정.

## Complexity Tracking

위반 사항 없음. UI 레이아웃 단순화 변경이라 신규 추상 도입 없음.
