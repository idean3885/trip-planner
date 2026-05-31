---
description: "Task list for 036-mobile-detail-interaction"
---

# Tasks: 모바일 트립 상세 인터랙션 개선

**Input**: `/specs/036-mobile-detail-interaction/` (plan.md, spec.md, research.md, quickstart.md)
**Tests**: 회귀 테스트 포함(자가 검증에 vitest 전체 실행 의무).

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

## Phase 1: Setup

설정 변경 없음 — 기존 Next.js/Tailwind/embla 구성 재사용(신규 의존성 도입 없음).

## Phase 2: Foundational

공통 선행 작업 없음 — 각 User Story는 독립 구현·테스트 가능. 모두 모바일(<1024px) 분기에 한정하고 데스크탑 경로를 건드리지 않는다.

## Phase 3: User Story 1 — 캘린더 sticky 경계 스크롤 양방향 1차 정지 (P1)

**Goal**: 아래로 스크롤 시 캘린더 고정 경계에서 한 번 정지, 위로 스크롤 시 일정 최상단 도달 후에만 캘린더 해제.
**Independent Test**: 모바일 폭에서 긴 일정 날짜를 아래/위로 스크롤해 경계 정지·해제 조건 확인.

- [x] T001 [US1] 모바일에서만 document 스크롤에 `scroll-snap-type: y proximity`(globals.css `html.trip-snap`)를 켜고, 캘린더 높이를 `--trip-cal-h`로 노출 + 일정 패널을 `snap-start`/`scroll-mt` 정지점으로 지정 in src/components/trip/TripDetailLayout.tsx, src/app/globals.css [artifact: src/components/trip/TripDetailLayout.tsx] [why: scroll-snap-stage] [multi-step: 2]
- [ ] T002 [US1] 스크롤 정지·해제 거동은 jsdom(레이아웃·스크롤 부재)으로 검증 불가 — dev 실기기 수동 확인(quickstart US1) in tests/components/trip/TripDetailLayout.test.tsx [artifact: tests/components/trip/TripDetailLayout.test.tsx] [why: scroll-snap-stage]

## Phase 4: User Story 2 — 미로딩 날짜 스와이프 즉시 이동 (P1)

**Goal**: 다음 날짜 활동 로딩 여부와 무관하게 스와이프가 즉시 넘어가고, 미로딩은 스켈레톤으로 표시.
**Independent Test**: 미열람 먼 날짜로 연속 스와이프 시 매번 즉시 이동 + 스켈레톤 표시.

- [x] T003 [US2] 스와이프 커밋을 `settle`(모션 종료)에서 `select`(스냅 목표 확정 즉시)로 옮겨 데이터 도착 대기 없이 즉시 이동하도록 변경 in src/components/trip/SwipeCarousel.tsx [artifact: src/components/trip/SwipeCarousel.tsx] [why: swipe-instant] [multi-step: 2]
- [ ] T004 [US2] 미로딩 즉시 이동은 embla 스냅·레이아웃 의존이라 jsdom 검증 불가 — dev 실기기 수동 확인(quickstart US2). 구조 계약은 기존 tests/components/trip/SwipeCarousel.test.tsx 유지 [artifact: tests/components/trip/SwipeCarousel.test.tsx] [why: swipe-instant]

## Phase 5: User Story 3 — 스와이프-캘린더 강조 동시 갱신 (P2)

**Goal**: 스와이프로 날짜가 바뀔 때 일정과 캘린더 선택 강조가 같은 타이밍에 갱신.
**Independent Test**: 한 칸 스와이프 정착 시 캘린더 강조가 일정과 동시에 이동.

- [x] T005 [US3] `select` 즉시 커밋으로 selectedDate가 일정·캘린더 강조를 같은 시점에 갱신(단일 상태 파생) — 강조 지연 제거 in src/components/trip/SwipeCarousel.tsx, src/components/trip/TripDetailLayout.tsx [artifact: src/components/trip/SwipeCarousel.tsx] [why: swipe-sync-highlight]
- [ ] T006 [US3] 강조 동시 갱신은 스냅 이벤트 의존이라 jsdom 검증 불가 — dev 실기기 수동 확인(quickstart US3) in tests/components/trip/SwipeCarousel.test.tsx [artifact: tests/components/trip/SwipeCarousel.test.tsx] [why: swipe-sync-highlight]

## Phase 6: User Story 4 — 일정 섹션 상단 헤더 제거 (P2)

**Goal**: 일정 섹션 상단 날짜/개수 헤더 제거.
**Independent Test**: 날짜 선택 시 일정 위 날짜 헤더 미표시, 목록 바로 노출.

- [x] T007 [US4] DayActivitiesPane에 `showDateHeader` prop 추가 — 모바일(false) 날짜 헤더 숨김, 데스크탑(기본 true) 유지 in src/components/trip/DayActivitiesPane.tsx [artifact: src/components/trip/DayActivitiesPane.tsx] [why: header-removal]
- [x] T008 [US4] showDateHeader=false 시 날짜 헤더 미렌더·본문 유지 회귀 테스트 in tests/components/trip/DayActivitiesPane.test.tsx [artifact: tests/components/trip/DayActivitiesPane.test.tsx] [why: header-removal]

## Phase 7: User Story 5 — '자세히' 버튼 디자인 토큰화 (P3)

**Goal**: '자세히'를 토큰 버튼 외형으로 정비 + Ellipsis 제거, Dialog 동작 유지.
**Independent Test**: 상단 '자세히'가 버튼 외형·아이콘 없음, 클릭 시 여행 정보 Dialog 오픈.

- [x] T009 [US5] '자세히' 버튼을 `variant="outline"` 토큰 버튼으로 교체 + Ellipsis 아이콘 제거(Dialog 트리거 유지) in src/components/trip/TripDetailLayout.tsx [artifact: src/components/trip/TripDetailLayout.tsx] [why: detail-button-token]
- [x] T010 [US5] Ellipsis(svg) 부재 + '자세히' 클릭 시 여행 정보 Dialog 오픈 회귀 테스트 in tests/components/trip/TripDetailLayout.test.tsx [artifact: tests/components/trip/TripDetailLayout.test.tsx] [why: detail-button-token]

## Phase 8: Polish & Cross-Cutting

- [x] T011 vitest 전체 실행(`npx vitest run`, 427 pass) + typecheck/lint 0 error 확인 [artifact: src/components/trip/TripDetailLayout.tsx] [why: scroll-snap-stage]
- [ ] T012 데스크탑(≥1024px) 2분할 레이아웃 동작 불변 + 모바일 스크롤/스와이프 거동 dev 실기기 수동 확인 [artifact: src/components/trip/TripDetailLayout.tsx] [why: header-removal]

## Phase 9: Release fragments (release build가 소비 — 미체크 유지)

- [ ] T013 towncrier 단편 추가 in changes/681.feat.md [artifact: changes/681.feat.md] [why: scroll-snap-stage]
- [ ] T014 towncrier 단편 추가 in changes/682.fix.md [artifact: changes/682.fix.md] [why: swipe-instant]
- [ ] T015 towncrier 단편 추가 in changes/683.fix.md [artifact: changes/683.fix.md] [why: swipe-sync-highlight]
- [ ] T016 towncrier 단편 추가 in changes/684.fix.md [artifact: changes/684.fix.md] [why: detail-button-token]

## Dependencies

- US1~US5는 상호 독립. 다만 US1·US3·US5가 모두 `TripDetailLayout.tsx`를 수정하므로 같은 파일 편집 충돌을 피해 순차 진행(US1 → US3 → US5).
- US2는 `SwipeCarousel.tsx` 중심, US4는 `DayActivitiesPane.tsx` 중심으로 병렬 여지.
- T011/T012는 전 구현 완료 후. T013~T016은 release 단계에서 소비.

## Implementation Strategy

MVP는 US1(스크롤 정지) + US2(스와이프 즉시 이동) = P1 두 건. 이후 US3·US4·US5를 증분 적용. 시각·터치는 dev 환경(dev.trip.idean.me) 실기기로 최종 확인.
