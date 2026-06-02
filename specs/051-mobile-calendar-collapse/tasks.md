---
description: "Task list for spec 051 — 모바일 캘린더 스크롤 접힘"
---

# Tasks: 모바일 캘린더 스크롤 접힘

**Input**: Design documents from `/specs/051-mobile-calendar-collapse/`
**Prerequisites**: plan.md, spec.md, quickstart.md

## Phase 1: US1 — 스크롤 시 주간 자동 접힘

- [x] T001 [US1] CalendarView/MobileCompactCalendar collapsed prop — 주간 강제 + 복원, 자동 제어 중 토글 숨김 [artifact: src/components/trip/CalendarView.tsx] [why: scroll-collapse]
- [x] T002 [US1] TripDetailLayout sentinel + IntersectionObserver 상단 고정 감지 → collapsed 전달 [artifact: src/components/trip/TripDetailLayout.tsx] [why: scroll-collapse]
- [x] T003 [US1] collapsed → 주간 렌더 단위테스트 [artifact: tests/components/trip/calendar-collapse.test.tsx] [why: scroll-collapse]

## Phase 2: US2 — 반응형

- [x] T004 [US2] 320px·큰 폭에서 월간 셀·주간 스트립 폭 비례 유지(고정폭·과한 패딩 제거) [artifact: src/components/trip/CalendarView.tsx] [why: responsive]

## Phase 3: 검증 & 릴리즈

- [x] T005 전체 lint·typecheck·vitest 통과 확인 [artifact: specs/051-mobile-calendar-collapse/quickstart.md] [why: scroll-collapse]
- [ ] T006 towncrier 단편 작성(changes/736.feat.md) [artifact: changes/736.feat.md] [why: responsive]

## Dependencies

- T001 → T002 (collapsed 수신부 → 송신부)
- T003 T001/T002 후, T004 독립
- T005 마지막, T006 미체크 유지(release 소비)

## Notes

- T006 미체크 유지(towncrier 단편 — release build 소비, drift 오탐 방지).
- 스크롤·sticky 실거동은 로컬 빌드 제약으로 실기기 후속 검증.
