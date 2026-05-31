# Implementation Plan: 모바일 트립 상세 2단계 분리 스크롤

**Branch**: `037-mobile-nested-scroll` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/037-mobile-nested-scroll/spec.md`

## Summary

모바일(<1024px) 트립 상세를 고정 높이 뷰포트 컨테이너로 두고, 안에 [여행 요약 헤더 → sticky 캘린더 → 자체 스크롤 일정 영역]을 중첩 스크롤(nested scrolling)로 배치한다. 일정 영역에 `overscroll-behavior: contain`을 주어 경계에서 스크롤 연쇄를 끊는다(= "한 번 멈춤"). 스크롤 속도는 네이티브 유지(snap·감속 없음). 데스크탑은 변경 없음.

## Coverage Targets

- 모바일 중첩 스크롤 레이아웃 구성(캘린더 높이 측정 + 일정 자체 스크롤 영역 + 날짜 선택 시 스크롤 위계) [why: nested-layout] [multi-step: 3]
- 일정 영역 경계 스크롤 연쇄 차단(overscroll-behavior) [why: overscroll-boundary]
- 좌우 날짜 스와이프 공존 보존(세로 분리가 가로 스와이프를 막지 않음) [why: swipe-coexist]
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
└── app/globals.css                       # 필요 시 dvh/overscroll 유틸 보조(가능하면 Tailwind 클래스로)

tests/
└── components/trip/
    └── TripDetailLayout.test.tsx         # 레이아웃 구조·데스크탑 무영향 회귀
```

**Structure Decision**: 단일 Next.js 앱. 변경은 `TripDetailLayout.tsx`(모바일 분기)에 집중하고, `page.tsx`는 모바일에서 기존 상단 헤더를 숨기고 요약을 컨테이너 안으로 옮기는 분기만 둔다. CSS는 가능한 한 Tailwind 유틸(`h-[100dvh]`, `overflow-y-auto`, `overscroll-contain`, `sticky`)로 표현하고, 전역 CSS 추가는 최소화한다.

## 구현 접근 (HOW 요약)

> 구현 중 더 단순한 구조를 채택했다. 기존 DOM 순서(`page.tsx` 헤더 → 캘린더 sticky → 일정)가 이미 "헤더 위 → 캘린더 → 일정"이라, 헤더를 컨테이너 안으로 옮기거나 `page.tsx`를 데스크탑 전용으로 분기할 필요가 없었다. **바깥 스크롤은 기존 document 스크롤을 그대로 쓰고, 일정 영역만 자체 스크롤로 만든다.**

1. **바깥(1단계)**: 기존 document 스크롤 유지. 헤더(뒤로가기·제목·기간·개요)가 위로 사라지고 캘린더가 `sticky top-0`에 고정된다.
2. **캘린더 높이 측정**: sticky 캘린더 영역 높이를 `ResizeObserver`로 측정해 `--trip-cal-h` CSS 변수로 노출(월↔주 토글 시 갱신).
3. **일정 영역(2단계)**: `overflow-y-auto` + `overscroll-contain` + `height: calc(100dvh - var(--trip-cal-h))`. 캘린더 고정 시 화면을 꽉 채우고, 끝에서 바깥(document)으로의 chaining을 끊어 경계 멈춤을 만든다.
4. **날짜 선택 스크롤 복귀**: 다른 날짜 선택 시 일정 영역(window 아닌 패널)을 맨 위로.
5. **좌우 스와이프**: `SwipeCarousel` 현행 `touch-pan-y` 유지. 세로는 일정 영역, 가로는 embla.
6. **회귀 가드**: 데스크탑 2분할 DOM·일정 영역 구조를 테스트로 고정.

`page.tsx`·`CalendarView`·`SwipeCarousel`은 변경하지 않는다(참조만). 변경은 `TripDetailLayout.tsx`와 테스트에 한정된다.
