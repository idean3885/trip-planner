---
description: "Task list for 037-mobile-nested-scroll"
---

# Tasks: 모바일 트립 상세 2단계 분리 스크롤

**Input**: Design documents from `/specs/037-mobile-nested-scroll/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: 거동(스크롤 단계 분리·경계 멈춤)은 jsdom 미검증 → 실기기 정본. 자동 테스트는 레이아웃 구조·데스크탑 무영향 회귀만 둔다.

**Organization**: User Story 단위 그룹. UI 전용 — 데이터·계약 산출물 없음. 변경은 `TripDetailLayout.tsx`와 테스트에 한정(기존 DOM 순서가 이미 헤더→캘린더→일정이라 `page.tsx`·`CalendarView`·`SwipeCarousel`은 미변경).

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

---

## Phase 1: Setup

신규 의존성·구성 변경 없음(spec 036 Active Technologies 승계). Setup 태스크 없음.

## Phase 2: Foundational — 캘린더 높이 측정

- [x] T001 sticky 캘린더 영역 높이를 `ResizeObserver`로 측정해 `--trip-cal-h` CSS 변수로 노출한다(월↔주 토글 시 갱신, 데스크탑은 offsetHeight 0 → 미설정) [artifact: src/components/trip/TripDetailLayout.tsx] [why: nested-layout]

## Phase 3: User Story 1 — 헤더가 올라가 캘린더 고정, 경계에서 한 번 멈춤 (P1)

**목표**: 최상단에서 아래로 스크롤하면 헤더만 올라가 캘린더가 상단 고정에 도달하고(document 1단계), 그 제스처가 일정으로 이어지지 않는다.

**Independent Test**: 실기기에서 최상단부터 한 번 아래로 스크롤 → 헤더만 사라지고 캘린더 고정 지점에서 끊김 확인(quickstart US1).

- [x] T002 [US1] 일정 영역을 `height: calc(100dvh - var(--trip-cal-h))` 자체 세로 스크롤 영역(`overflow-y-auto`)으로 구성한다. 캘린더 고정 시 화면을 꽉 채워 document 스크롤이 헤더 높이만큼만 가능하게 한다 [artifact: src/components/trip/TripDetailLayout.tsx] [why: nested-layout]
- [x] T003 [US1] 일정 스크롤 영역에 `overscroll-behavior: contain`(Tailwind `overscroll-contain`)을 적용해 일정 끝에서 바깥(document)으로의 스크롤 연쇄를 끊는다 [artifact: src/components/trip/TripDetailLayout.tsx] [why: overscroll-boundary]

## Phase 4: User Story 2 — 일정만 스크롤, 경계 멈춤 후 헤더 복귀 (P1)

**목표**: 캘린더 고정 중 일정만 스크롤되고, 일정 최상단에서 끊긴 뒤 추가 위 스크롤(document)에서 헤더가 복귀한다. 다른 날짜 선택 시 일정 영역이 맨 위로 돌아간다.

**Independent Test**: 캘린더 고정 상태에서 일정을 내렸다가 위로 끝까지 → 일정 최상단에서 끊기고 추가 제스처로 헤더 복귀 확인(quickstart US2).

- [x] T004 [US2] 다른 날짜 선택 시 일정 영역(window 아닌 패널)을 맨 위로 되돌려, 헤더 복귀↔일정 스크롤의 위계를 명확히 한다 [artifact: src/components/trip/TripDetailLayout.tsx] [why: nested-layout]

## Phase 5: User Story 3 — 좌우 날짜 스와이프 공존 (P2)

**목표**: 세로 스크롤 분리 후에도 일정 영역 좌우 스와이프(날짜 이동)가 동작하고, 세로 스크롤이 좌우 스와이프를 트리거하지 않는다.

**Independent Test**: 일정 영역 좌우 스와이프로 날짜 하루 이동, 세로 스크롤은 날짜 불변 확인(quickstart US3).

- [x] T005 [US3] 일정 영역의 `SwipeCarousel`이 세로 스크롤 컨테이너 안에서 현행 `touch-pan-y`(가로만 처리·세로는 컨테이너로 위임)를 유지하도록 두고 좁은 `touch-action` 강제를 넣지 않는다 [artifact: src/components/trip/TripDetailLayout.tsx] [why: swipe-coexist]

## Phase 6: Polish & 회귀 가드

- [x] T006 [P] 일정 영역의 `overflow-y-auto`/`overscroll-contain`/높이 calc 구조와 데스크탑(≥1024px) 2분할 DOM 존속을 회귀 테스트로 고정한다 [artifact: tests/components/trip/TripDetailLayout.test.tsx] [why: desktop-regression]
- [x] T007 [P] 좌우 스와이프 캐러셀의 `touch-pan-y` 유지를 테스트로 고정한다 [artifact: tests/components/trip/TripDetailLayout.test.tsx] [why: swipe-coexist]

## Dependencies

- T001(캘린더 높이 변수) → T002(일정 영역 높이 calc) → T003(overscroll) → T004(스크롤 복귀).
- T005는 기존 `SwipeCarousel` 유지 확인. T006·T007은 구현 후 회귀 가드[P].

## Implementation Strategy

- **MVP**: T001~T003 — 캘린더 고정 경계 + 일정 자체 스크롤 경계 멈춤만으로 핵심 가치 전달.
- 실기기(trip.idean.me 프리뷰)에서 quickstart 수동 체크. `100dvh` 높이 합산·gap 미세 오차가 보이면 calc 보정. 경계 거동이 부족하면 plan research의 "최소 JS 보강" 검토.

> 단편(`changes/<이슈>.feat.md`)은 PR 단계에서 작성한다(towncrier build가 소비). tasks 미포함 — drift 회피.
