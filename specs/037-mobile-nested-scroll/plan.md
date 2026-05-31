# Implementation Plan: 모바일 트립 상세 2단계 분리 스크롤

**Branch**: `037-mobile-nested-scroll` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/037-mobile-nested-scroll/spec.md`

## Summary

모바일(<1024px) 트립 상세를 고정 높이 뷰포트 컨테이너로 두고, 안에 [여행 요약 헤더 → sticky 캘린더 → 자체 스크롤 일정 영역]을 중첩 스크롤(nested scrolling)로 배치한다. 일정 영역에 `overscroll-behavior: contain`을 주어 경계에서 스크롤 연쇄를 끊는다(= "한 번 멈춤"). 스크롤 속도는 네이티브 유지(snap·감속 없음). 데스크탑은 변경 없음.

## Coverage Targets

- 모바일 단일 스크롤 골격(GSAP 도입 + 이전 CSS snap 정리 + 날짜 선택 시 패널 정렬 스크롤) [why: single-scroll] [multi-step: 3]
- 캘린더 경계 1점 정지(GSAP ScrollTrigger snap, 모바일 matchMedia 한정) [why: snap-boundary]
- 좌우 날짜 스와이프 공존 보존(단일 스크롤이 가로 스와이프를 막지 않음) [why: swipe-coexist]
- 데스크탑 무영향 + 회귀 가드 [why: desktop-regression]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+
**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui(vendored), embla-carousel-react, lucide-react. **신규 의존성: `gsap`(^3.15) + `@gsap/react`(^2.1)** — 단일 스크롤에서 캘린더 경계 1회 멈춤을 CSS scroll-snap의 snap-back 없이 구현하기 위해 도입(무료 라이선스).
**Storage**: N/A (UI 전용, 영속 데이터 스키마 변경 없음)
**Testing**: vitest + Testing Library(jsdom). snap 거동은 jsdom 미검증 → 실기기 수동 확인이 정본.
**Target Platform**: 모바일 브라우저(<1024px). iOS Safari·Chrome Android 포함.
**Project Type**: web application (Next.js 단일 앱)
**Performance Goals**: 스크롤 속도는 기기 네이티브 관성과 동일. snap은 캘린더 경계 1점에만, 짧은 duration으로 복귀 최소화.
**Constraints**: 좌우 날짜 스와이프 회귀 금지(#649 전례). GSAP은 모바일 한정(`matchMedia`) 적용·데스크탑 무영향. SSR(서버 렌더) 안전성 Vercel 빌드 확인.
**Scale/Scope**: 모바일 트립 상세 1개 화면. `TripDetailLayout` 한 컴포넌트 + `globals.css` 정리.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **III. Mobile-First Delivery**: ✅ 정면 부합 — 모바일 열람 동선 개선이 목적.
- **V. Cross-Domain Integrity**: ✅ 무관 — 데이터 소유·도메인 경계 변화 없음(UI 전용).
- **VI. Role-Based Access Control**: ✅ 무관 — 권한 매트릭스 변화 없음. 표시 동작만 변경.
- **VII. Calendar Time Model**: ✅ 무관 — 시간 표시 로직 변화 없음.
- **II. Minimum Cost**: ✅ GSAP 도입하나 무료 라이선스("no charge")·과금 없음. 라이브러리 우선 원칙(ADR-0002) 부합 — 검증된 표준 라이브러리로 직접 구현 리스크를 줄인다.

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
├── components/trip/
│   ├── TripDetailLayout.tsx          # GSAP 등록 + useGSAP ScrollTrigger snap(모바일), 날짜선택 scrollTo
│   ├── CalendarView.tsx              # (참조만, 미변경)
│   └── SwipeCarousel.tsx             # (참조만, touch-pan-y 유지)
└── app/globals.css                   # 이전 html.trip-snap 블록 제거

package.json                          # gsap + @gsap/react 추가

tests/
└── components/trip/
    └── TripDetailLayout.test.tsx     # 렌더·데스크탑 무영향·touch-pan-y 회귀
```

**Structure Decision**: 단일 Next.js 앱. 변경은 `TripDetailLayout.tsx`에 집중한다. `page.tsx`·`CalendarView`·`SwipeCarousel`은 건드리지 않는다(기존 DOM 순서가 이미 헤더→캘린더→일정이라 그대로 단일 스크롤 흐름이 됨).

## 구현 접근 (HOW 요약)

> CSS scroll-snap(037 1~2차)은 "오버슈트 후 복귀(snap-back)"가 본질이라 사용자가 본 "지나쳤다 되돌아옴"을 못 없앴다. 중첩 스크롤은 "어디든 동일"을 위배했다. **단일 document 스크롤 + 캘린더 sticky + GSAP ScrollTrigger snap(경계 1점)**으로 재설계한다.

1. **GSAP 도입**: `gsap` + `@gsap/react`. 모듈 레벨 `gsap.registerPlugin(useGSAP, ScrollTrigger)`.
2. **단일 스크롤 유지**: 화면 전체 document 스크롤(손가락 위치 무관 동일). 헤더가 사라지고 캘린더 `sticky top-0` 고정. 이전 CSS `html.trip-snap`·`--trip-cal-h`·패널 snap 클래스는 제거.
3. **캘린더 경계 1점 snap**: `useGSAP` + `gsap.matchMedia("(max-width:1023px)")` 안에서 `ScrollTrigger.create({ snap: { snapTo } })`. `snapTo`는 헤더 구간(0~`sticky.offsetTop`)에서만 0 또는 경계로 보내고 일정 구간은 현재 값을 반환(자유). `duration: 0.12`로 복귀 최소화. cleanup에서 `mm.revert()`.
4. **날짜 선택 스크롤 정렬**: 다른 날짜 선택 시 일정 패널 상단이 캘린더 바로 아래 오도록 `window.scrollTo`(sticky 높이 보정).
5. **좌우 스와이프**: `SwipeCarousel` 현행 `touch-pan-y` 유지.
6. **회귀 가드**: 데스크탑 2분할 DOM·캐러셀 렌더를 테스트로 고정.

`page.tsx`·`CalendarView`·`SwipeCarousel`은 변경하지 않는다. 변경은 `TripDetailLayout.tsx`·`globals.css`·`package.json`·테스트에 한정된다.
