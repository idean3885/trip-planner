---
description: "Task list for spec 039 — 로그인 후 홈 캘린더 제거"
---

# Tasks: 로그인 후 홈 캘린더 제거

**Input**: Design documents from `/specs/039-home-remove-calendar/`
**Prerequisites**: plan.md, spec.md, quickstart.md

## Phase 1: US1 — 홈에서 여행 목록만 (Priority: P1)

- [x] T001 [US1] page.tsx에서 TripsCalendar import·마운트 + 캘린더 전용 데이터(allDays·datesByTripId·calendarTrips) 제거, 2분할 grid를 단일 컬럼 목록으로 전환 [artifact: src/app/trips/page.tsx] [why: home-remove-cal]
- [x] T002 [US1] list-grid.test.ts를 단일 컬럼·캘린더 부재 검증으로 갱신 [artifact: tests/app/trips/list-grid.test.ts] [why: home-remove-cal]

## Phase 2: dead code 정리

- [ ] T003 TripsCalendar.tsx 삭제 (홈 전용 dead code) [artifact: src/components/trip/TripsCalendar.tsx] [why: dead-cleanup]
- [x] T004 TripsCalendar 참조 잔여 확인 + 전체 lint/test 통과 검증 [artifact: tests/app/trips/list-grid.test.ts] [why: dead-cleanup]

## Phase 3: 릴리즈 단편

- [ ] T005 towncrier 단편 작성 (changes/703.feat.md — What/이유, 합쇼체) [artifact: changes/703.feat.md] [why: home-remove-cal]

## Dependencies

- T001 → T002 (페이지 변경 후 테스트 갱신)
- T003은 T001 후 (홈 참조 제거 후 삭제)
- T005 미체크 유지 (release build가 단편 소비)
- T003 미체크 유지 (삭제 태스크 — 산출물이 부재가 정상이라 drift 검증기가 [x]를 오탐. 삭제는 실제 완료됨)
