---
description: "Task list for 037-mobile-nested-scroll"
---

# Tasks: 모바일 트립 상세 단일 스크롤 + 캘린더 경계 1회 멈춤 (GSAP)

**Input**: Design documents from `/specs/037-mobile-nested-scroll/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: snap 거동은 jsdom 미검증 → 실기기 정본. 자동 테스트는 렌더·데스크탑 무영향·touch-pan-y 회귀만.

**Organization**: User Story 단위. UI 전용. 변경은 `TripDetailLayout.tsx`·`globals.css`·`package.json`·테스트에 한정.

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

---

## Phase 1: Setup

- [x] T001 `gsap`(^3.15) + `@gsap/react`(^2.1) 의존성을 추가하고 모듈 레벨에서 `gsap.registerPlugin(useGSAP, ScrollTrigger)`를 등록한다 [artifact: package.json] [why: single-scroll]

## Phase 2: Foundational — 이전 CSS snap 정리

- [x] T002 037 이전 시도의 CSS scroll-snap 잔재를 제거한다 — `globals.css`의 `html.trip-snap` 미디어쿼리 [artifact: src/app/globals.css] [why: single-scroll]

## Phase 3: User Story 1 — 헤더가 올라가 캘린더 고정, 경계 1회 멈춤 (P1)

**목표**: 최상단에서 아래로 스크롤하면 헤더가 사라져 캘린더가 sticky 고정되고, 그 경계에서 한 번 멈춘다(오버슈트 후 복귀 없이). 손가락 위치와 무관하게 동일(단일 스크롤).

**Independent Test**: 실기기에서 최상단부터 아래로 스크롤 → 헤더 사라지고 캘린더 고정 경계에서 멈춤, 되돌아오는 동작이 없는지 확인(quickstart US1).

- [x] T003 [US1] `useGSAP` + `gsap.matchMedia("(max-width:1023px)")` 안에서 `ScrollTrigger.create({ snap })`로 캘린더 경계(`sticky.offsetTop`) 1점 정지를 만든다. `snapTo`는 헤더 구간에서만 0/경계로 보내고 일정 구간은 현재 값을 반환(자유), `duration: 0.12`로 복귀 최소화. cleanup에서 `mm.revert()` [artifact: src/components/trip/TripDetailLayout.tsx] [why: snap-boundary]

## Phase 4: User Story 2 — 일정만 스크롤, 경계 후 헤더 복귀 (P1)

**목표**: 캘린더 고정 후 일정 구간은 자유 스크롤되고, 위로 스크롤하면 경계에서 멈춘 뒤 헤더가 복귀한다. 다른 날짜 선택 시 일정 패널이 캘린더 바로 아래로 정렬된다.

**Independent Test**: 캘린더 고정 상태에서 일정을 내렸다 위로 → 경계에서 멈춤 후 헤더 복귀 확인(quickstart US2).

- [x] T004 [US2] 다른 날짜 선택 시 일정 패널 상단이 sticky 캘린더 바로 아래 오도록 `window.scrollTo`(단일 스크롤, 캘린더 높이 보정)로 정렬한다. 일정 패널의 이전 snap 클래스(`snap-start` 등)는 제거한다 [artifact: src/components/trip/TripDetailLayout.tsx] [why: single-scroll]

## Phase 5: User Story 3 — 좌우 날짜 스와이프 공존 (P2)

**목표**: 단일 스크롤 + GSAP snap에서도 일정 영역 좌우 스와이프가 동작하고, 세로 스크롤이 좌우 스와이프를 트리거하지 않는다.

**Independent Test**: 일정 영역 좌우 스와이프로 날짜 이동, 세로 스크롤은 날짜 불변 확인(quickstart US3).

- [x] T005 [US3] 일정 영역의 `SwipeCarousel`이 현행 `touch-pan-y`(가로만 처리·세로는 document에 위임)를 유지하도록 두고, GSAP snap이 스크롤 종료 시점에만 개입해 가로 스와이프와 충돌하지 않게 한다 [artifact: src/components/trip/TripDetailLayout.tsx] [why: swipe-coexist]

## Phase 6: Polish & 회귀 가드

- [x] T006 [P] GSAP `matchMedia` 모바일 한정 적용으로 데스크탑(≥1024px) 2분할 DOM이 영향받지 않음과 컴포넌트 렌더를 회귀 테스트로 고정한다 [artifact: tests/components/trip/TripDetailLayout.test.tsx] [why: desktop-regression]
- [x] T007 [P] 좌우 스와이프 캐러셀의 `touch-pan-y` 유지를 테스트로 고정한다 [artifact: tests/components/trip/TripDetailLayout.test.tsx] [why: swipe-coexist]

## Dependencies

- T001(GSAP 도입) → T003(useGSAP). T002(CSS 정리)·T004는 독립적.
- T006·T007은 구현 후 회귀 가드[P].

## Implementation Strategy

- **MVP**: T001~T003 — GSAP 경계 1회 멈춤.
- 실기기(dev.trip.idean.me / 프리뷰)에서 quickstart 수동 체크. "지나쳤다 복귀" 없이 경계에서 멈추는지, fling 지터·SSR 빌드 안전성 확인. 복귀가 보이면 duration 단축 또는 onUpdate 클램프, 지터 심하면 normalizeScroll(관성 트레이드오프) 검토.

> 단편(`changes/696.feat.md`)은 이미 develop에 있다. 구현 방식 변경에 맞춰 문구만 정정한다.
