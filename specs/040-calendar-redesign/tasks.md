---
description: "Task list for spec 040 — 여행 상세 캘린더 재설계"
---

# Tasks: 여행 상세 캘린더 재설계

**Input**: Design documents from `/specs/040-calendar-redesign/`
**Prerequisites**: plan.md, spec.md, quickstart.md

**Tests**: 시각/인터랙션은 정적·구성 검증(자동) + 실기기(사후). 동작 동등성은 기존 vitest로 확인.

## Phase 1: US1 — 가로 grow (Priority: P1)

- [x] T001 [US1] ui/calendar.tsx의 day 셀을 flex-1로 균등 7등분 + desktopFull에서 --cell-size 상한 해제(가로 100%, 정사각 → 세로 자동) [artifact: src/components/ui/calendar.tsx] [why: cal-grow]
- [x] T002 [US1] CalendarView desktopFull 폭/래퍼를 컨테이너 100%에 맞춰 조정 [artifact: src/components/trip/CalendarView.tsx] [why: cal-grow]

## Phase 2: US2 — 셀 일정명/도트 (Priority: P1)

- [x] T003 [US2] 단일 trip 셀에 일정명 노출(넓은 폭) / 도트(좁은 폭) 분기 렌더 [artifact: src/components/trip/CalendarView.tsx] [why: cell-content]
- [x] T004 [US2] 셀 일정명/도트 분기 단위테스트 [artifact: tests/components/trip/calendar-cell-content.test.tsx] [why: cell-content]

## Phase 3: US3 — 월↔주 전환 데스크탑 스크롤 (Priority: P2)

- [ ] T005 [US3] 데스크탑에서도 스크롤 제스처로 월↔주 전환 배선(기존 스와이프·버튼 유지) [artifact: src/components/trip/TripDetailLayout.tsx] [why: month-week]

## Phase 4: US4 — 경계 스크롤 멈춤 vh (Priority: P2)

- [x] T006 [US4] GSAP ScrollTrigger snapTo 트리거를 sticky.offsetTop → 뷰포트 높이(vh) 기준으로 교체, 되돌림 보정 제거 [artifact: src/components/trip/TripDetailLayout.tsx] [why: scroll-stop]

## Phase 5: US5 — 빈 스크롤 제거 (Priority: P3)

- [x] T007 [US5] SwipeCarousel 슬라이드/일정 패널 높이를 선택일 분량 기준으로(고정 높이 제거) [artifact: src/components/trip/SwipeCarousel.tsx] [why: empty-scroll]

## Phase 6: US6 — 일정 셀 일관 + 월간 토큰 (Priority: P3)

- [x] T008 [US6] 일정 있는 셀 렌더를 다른 셀과 동일 규칙으로 일관화 [artifact: src/components/trip/CalendarView.tsx] [why: cell-token]
- [x] T009 [US6] 월간 뷰 구분선·배경·일정 막대를 디자인 토큰으로 정비(하드코딩 색 제거, 색상 가드 통과) [artifact: src/components/ui/calendar.tsx] [why: cell-token]

## Phase 7: 검증 & 릴리즈

- [x] T010 전체 lint(색상 가드 포함)·typecheck·vitest 통과 확인 [artifact: specs/040-calendar-redesign/quickstart.md] [why: empty-scroll]
- [ ] T011 towncrier 단편 작성 (changes/704.feat.md — What/이유, 합쇼체) [artifact: changes/704.feat.md] [why: month-week]

## Dependencies

- T001 → T002 (셀 그리드 후 래퍼)
- T003 → T004 (렌더 후 테스트)
- US3·US4(TripDetailLayout)는 같은 파일이라 순차
- T010은 마지막, T011 미체크 유지(release 소비)

## Notes

- T011 미체크 유지(towncrier).
- T005 미체크(보류) — 데스크탑 휠 가로채기로 월↔주 전환은 세로 페이지 스크롤을 막는 #649류 치명 회귀 위험이 커, 실기기 검증 후 별도 처리한다. 모바일 스와이프+버튼(기존 enableMobileCompact)은 유지된다.
- 시각/인터랙션(US1·2·4·5·6)은 dev 반영 후 실기기 검증 — 스크롤 멈춤(US4)은 vh 1순위, 부정확 시 토글 문자열 높이 폴백.
