# Implementation Plan: 모바일 트립 상세 2단계 분리 스크롤

**Branch**: `037-mobile-nested-scroll` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/037-mobile-nested-scroll/spec.md`

## Summary

모바일(<1024px) 트립 상세를 고정 높이 뷰포트 컨테이너로 두고, 안에 [여행 요약 헤더 → sticky 캘린더 → 자체 스크롤 일정 영역]을 중첩 스크롤(nested scrolling)로 배치한다. 일정 영역에 `overscroll-behavior: contain`을 주어 경계에서 스크롤 연쇄를 끊는다(= "한 번 멈춤"). 스크롤 속도는 네이티브 유지(snap·감속 없음). 데스크탑은 변경 없음.

## Coverage Targets

- 모바일 단일 스크롤 골격(캘린더 높이 측정 + trip-snap 등록 + 날짜 선택 시 패널 정렬 스크롤) [why: single-scroll] [multi-step: 3]
- 캘린더 경계 1점 정지(scroll-snap proximity + snap-always + scroll-behavior auto) [why: snap-boundary]
- 좌우 날짜 스와이프 공존 보존(단일 스크롤이 가로 스와이프를 막지 않음) [why: swipe-coexist]
- 데스크탑 무영향 + 레이아웃 회귀 가드 [why: desktop-regression]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+
**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind CSS v4(`@theme` CSS-first), shadcn/ui(vendored), embla-carousel-react, lucide-react. **신규 의존성 도입 없음** — spec 036 Active Technologies 승계.
**Storage**: N/A (UI 전용, 영속 데이터 스키마 변경 없음)
**Testing**: vitest + Testing Library(jsdom). 단계 분리·경계 거동은 jsdom 미검증 → 실기기 수동 확인이 정본.
**Target Platform**: 모바일 브라우저(<1024px). iOS Safari·Chrome Android 포함.
**Project Type**: web application (Next.js 단일 앱)
**Performance Goals**: 스크롤 속도는 기기 네이티브 관성과 동일(인위적 감속·snap 없음).
**Constraints**: 좌우 날짜 스와이프 회귀 금지(#649 전례). `100dvh` 기반으로 주소창 높이 변화 흡수. 데스크탑 무영향.
**Scale/Scope**: 모바일 트립 상세 1개 화면. 컴포넌트 `TripDetailLayout` 중심, `page.tsx` 모바일 헤더 분기 조정.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **III. Mobile-First Delivery**: ✅ 정면 부합 — 모바일 열람 동선 개선이 목적.
- **V. Cross-Domain Integrity**: ✅ 무관 — 데이터 소유·도메인 경계 변화 없음(UI 전용).
- **VI. Role-Based Access Control**: ✅ 무관 — 권한 매트릭스 변화 없음. 표시 동작만 변경.
- **VII. Calendar Time Model**: ✅ 무관 — 시간 표시 로직 변화 없음.
- **II. Minimum Cost**: ✅ 신규 의존성·과금 없음.

위반 없음 → Complexity Tracking 불필요.

## Project Structure

### Documentation (this feature)

```text
specs/037-mobile-nested-scroll/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output (실기기 Evidence 규약)
├── checklists/
│   └── requirements.md  # spec 품질 체크리스트
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── trips/[id]/
│       └── page.tsx                      # 모바일: 기존 헤더를 데스크탑 전용으로 분기
├── components/
│   └── trip/
│       ├── TripDetailLayout.tsx          # 모바일 중첩 스크롤 컨테이너 + 요약 헤더 + 일정 스크롤 영역
│       ├── CalendarView.tsx              # (참조만) sticky 캘린더 높이 — 변경 최소
│       └── SwipeCarousel.tsx             # (참조만) touch-pan-y 유지
└── app/globals.css                       # html.trip-snap 미디어쿼리(scroll-snap-type + scroll-behavior auto)

tests/
└── components/trip/
    └── TripDetailLayout.test.tsx         # 레이아웃 구조·데스크탑 무영향 회귀
```

**Structure Decision**: 단일 Next.js 앱. 변경은 `TripDetailLayout.tsx`(모바일 분기)에 집중하고, `page.tsx`는 모바일에서 기존 상단 헤더를 숨기고 요약을 컨테이너 안으로 옮기는 분기만 둔다. CSS는 가능한 한 Tailwind 유틸(`h-[100dvh]`, `overflow-y-auto`, `overscroll-contain`, `sticky`)로 표현하고, 전역 CSS 추가는 최소화한다.

## 구현 접근 (HOW 요약)

> 1차 구현(중첩 스크롤: 일정 자체 overflow 영역)은 손가락 위치마다 스크롤 주체가 갈려 "어디를 스크롤해도 동일"을 위배해 철회했다(research 결정 1). **단일 document 스크롤 + 캘린더 sticky + 일정 패널 상단 1점 snap**으로 재설계한다.

1. **단일 스크롤**: 화면 전체가 기존 document 스크롤. 손가락 위치 무관 동일. 헤더(뒤로가기·제목·기간·개요)가 위로 사라지고 캘린더가 `sticky top-0`에 고정된다.
2. **캘린더 높이 측정 + trip-snap 등록**: sticky 캘린더 높이를 `ResizeObserver`로 측정해 `--trip-cal-h`로 노출(월↔주 토글 시 갱신). 마운트 동안 `html`에 `.trip-snap`을 붙여 모바일 한정 snap을 켠다.
3. **캘린더 경계 1점 정지**: 일정 패널 상단에 `snap-start snap-always`, `scroll-mt-[var(--trip-cal-h)]`. `html.trip-snap { scroll-snap-type: y proximity; scroll-behavior: auto }`(모바일). 캘린더 고정 경계에서 한 번 멈추고, auto로 snap 복귀를 즉시 처리해 속도를 유지한다. 일정 목록 내부는 정지점이 없어 자유 스크롤.
4. **날짜 선택 스크롤 정렬**: 다른 날짜 선택 시 일정 패널 상단이 캘린더 바로 아래 오도록 `window.scrollTo`.
5. **좌우 스와이프**: `SwipeCarousel` 현행 `touch-pan-y` 유지. 세로는 document, 가로는 embla.
6. **회귀 가드**: 데스크탑 2분할 DOM·정지점 클래스를 테스트로 고정.

`page.tsx`·`CalendarView`·`SwipeCarousel`은 변경하지 않는다(참조만). 변경은 `TripDetailLayout.tsx`·`globals.css`·테스트에 한정된다.
