---
description: "Task list for 037-mobile-nested-scroll"
---

# Tasks: 모바일 트립 상세 단일 스크롤 + 캘린더 경계 1회 멈춤

**Input**: Design documents from `/specs/037-mobile-nested-scroll/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: 단계 멈춤·경계 거동은 jsdom 미검증 → 실기기 정본. 자동 테스트는 정지점 클래스·데스크탑 무영향 회귀만.

**Organization**: User Story 단위. UI 전용 — 데이터·계약 산출물 없음. 변경은 `TripDetailLayout.tsx`·`globals.css`·테스트에 한정(기존 DOM 순서 유지, `page.tsx`·`CalendarView`·`SwipeCarousel` 미변경).

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

---

## Phase 1: Setup

신규 의존성·구성 변경 없음. Setup 태스크 없음.

## Phase 2: Foundational — 단일 스크롤 골격

- [x] T001 sticky 캘린더 높이를 `ResizeObserver`로 측정해 `--trip-cal-h`로 노출하고, 마운트 동안 `html`에 `.trip-snap`을 붙여 모바일 한정 snap을 켠다(데스크탑 offsetHeight 0 → 스킵) [artifact: src/components/trip/TripDetailLayout.tsx] [why: single-scroll]

## Phase 3: User Story 1 — 헤더가 올라가 캘린더 고정, 경계 1회 멈춤 (P1)

**목표**: 최상단에서 아래로 스크롤하면 헤더가 사라져 캘린더가 sticky 고정되고, 그 경계에서 한 번 멈춘다(빠른 fling 도 건너뛰지 못함). 손가락 위치와 무관하게 동일.

**Independent Test**: 실기기에서 최상단부터 아래로 스크롤 → 헤더 사라지고 캘린더 고정 경계에서 한 번 멈춤 확인(quickstart US1).

- [x] T002 [US1] `globals.css`에 `html.trip-snap { scroll-snap-type: y proximity; scroll-behavior: auto }`(모바일 <1024px)를 둔다. auto가 snap 복귀를 즉시 처리해 속도를 유지한다(v3.8.1 느림 원인 제거) [artifact: src/app/globals.css] [why: snap-boundary]
- [x] T003 [US1] 일정 패널 상단에 정지점을 둔다 — `snap-start snap-always scroll-mt-[var(--trip-cal-h)]`. snap-always로 빠른 fling 도 캘린더 경계를 건너뛰지 못하고, scroll-margin-top으로 정지 위치를 캘린더 바로 아래에 맞춘다. 일정 목록 내부는 정지점이 없어 자유 스크롤 [artifact: src/components/trip/TripDetailLayout.tsx] [why: single-scroll]

## Phase 4: User Story 2 — 일정만 스크롤, 경계 멈춤 후 헤더 복귀 (P1)

**목표**: 캘린더 고정 후 일정만 스크롤되고, 위로 스크롤하면 캘린더 경계에서 멈춘 뒤 헤더가 복귀한다. 다른 날짜 선택 시 일정 패널이 캘린더 바로 아래로 정렬된다.

**Independent Test**: 캘린더 고정 상태에서 일정을 내렸다가 위로 → 경계에서 멈춘 뒤 헤더 복귀 확인(quickstart US2).

- [x] T004 [US2] 다른 날짜 선택 시 일정 패널 상단이 sticky 캘린더 바로 아래 오도록 `window.scrollTo`(단일 스크롤, 캘린더 높이만큼 보정)로 정렬한다 [artifact: src/components/trip/TripDetailLayout.tsx] [why: single-scroll]

## Phase 5: User Story 3 — 좌우 날짜 스와이프 공존 (P2)

**목표**: 단일 스크롤에서도 일정 영역 좌우 스와이프(날짜 이동)가 동작하고, 세로 스크롤이 좌우 스와이프를 트리거하지 않는다.

**Independent Test**: 일정 영역 좌우 스와이프로 날짜 이동, 세로 스크롤은 날짜 불변 확인(quickstart US3).

- [x] T005 [US3] 일정 영역의 `SwipeCarousel`이 현행 `touch-pan-y`(가로만 처리·세로는 document에 위임)를 유지하도록 두고 좁은 `touch-action` 강제를 넣지 않는다 [artifact: src/components/trip/TripDetailLayout.tsx] [why: swipe-coexist]

## Phase 6: Polish & 회귀 가드

- [x] T006 [P] 일정 패널의 정지점 클래스(`snap-start snap-always scroll-mt-[var(--trip-cal-h)]`)와 데스크탑(≥1024px) 2분할 DOM 존속을 회귀 테스트로 고정한다 [artifact: tests/components/trip/TripDetailLayout.test.tsx] [why: desktop-regression]
- [x] T007 [P] 좌우 스와이프 캐러셀의 `touch-pan-y` 유지를 테스트로 고정한다 [artifact: tests/components/trip/TripDetailLayout.test.tsx] [why: swipe-coexist]

## Dependencies

- T001(높이 변수 + trip-snap) → T003(정지점, scroll-mt가 변수 사용). T002(globals)는 독립.
- T004는 T001 이후(높이 측정 필요). T006·T007은 구현 후 회귀 가드[P].

## Implementation Strategy

- **MVP**: T001~T003 — 단일 스크롤 + 캘린더 경계 1회 멈춤.
- 실기기(dev.trip.idean.me / 프리뷰)에서 quickstart 수동 체크. `snap-always`+`scroll-behavior:auto`가 "속도 유지 + 경계 멈춤"을 주는지 확인. 멈춤이 약하거나 느리면 정지점/타입 재조정 또는 멈춤 포기 검토(research 리스크).

> 단편(`changes/696.feat.md`)은 이미 develop에 있다(037 1차 PR). 구현 방식 변경에 맞춰 문구만 정정한다.
