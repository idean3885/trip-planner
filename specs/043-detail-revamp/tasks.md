---
description: "Task list for spec 043 — 여행 상세 화면 정비"
---

# Tasks: 여행 상세 화면 정비

**Input**: Design documents from `/specs/043-detail-revamp/`
**Prerequisites**: plan.md, spec.md, quickstart.md

## Phase 1: US1 — 여행 기간 직접 편집 (Priority: P1)

- [x] T001 [US1] 기간 set 엔드포인트 — 범위 밖 Day 활동 보유분 계산·confirm 게이트(409 wouldDelete)·범위 밖 삭제·경계 Day 생성 [artifact: src/app/api/trips/<id>/period/route.ts] [why: period-edit]
- [x] T002 [US1] 기간 편집 다이얼로그 — 시작/종료 입력, 손실 경고·확인, 시작>종료 거부([일정 변경] 진입을 이 다이얼로그로 교체) [artifact: src/components/TripPeriodDialog.tsx] [why: period-edit]
- [x] T003 [US1] 기간 set 동작 단위테스트(확장/축소 손실 경고/손실 없음 즉시 적용/시작>종료 거부) [artifact: tests/api/trip-period.test.ts] [why: period-edit]

## Phase 2: US2 — 헤더·액션바·캘린더 레이아웃 (Priority: P1)

- [x] T004 [US2] 브레드크럼에 기간 날짜 표기 + 액션바를 레이아웃으로 이관(서버 헤더 축소) [artifact: src/app/trips/<id>/page.tsx] [why: layout]
- [x] T005 [US2] 액션바 한 줄 통합(기간 편집·동행자·나가기/삭제·동기화·선택 일자 삭제) [artifact: src/components/trip/TripDetailLayout.tsx] [why: layout]
- [x] T006 [US2] 선택 일자 단독 삭제 버튼 노출(dayId 있을 때만 활성) [artifact: src/components/DayDeleteButton.tsx] [why: layout]
- [x] T007 [US2] 캘린더 가로 최대폭+좌우 여백, 세로 최대 높이 제한 [artifact: src/components/trip/CalendarView.tsx] [why: layout]

## Phase 3: US3 — 동기화 진입 단계 축소 (Priority: P2)

- [x] T008 [US3] 동기화 진입 카드의 중간 [열기] 제거 — 진입 즉시 내용 노출 [artifact: src/components/calendar-sync/CalendarSyncEntryCard.tsx] [why: calsync]
- [x] T009 [US3] 동기화 단일 진입 회귀 가드(진입 즉시 노출·열기 단계 부재) [artifact: tests/app/trips-id/layout-classes.test.ts] [why: calsync]

## Phase 4: US4 — 경계 멈춤 스크롤·패널 높이 (Priority: P2)

- [x] T010 [US4] 경계 멈춤 스크롤을 sticky 실측 경계 기준으로(vh 근사 제거) + 데스크탑 캘린더 sticky 고정 [artifact: src/components/trip/TripDetailLayout.tsx] [why: scroll]
- [x] T011 [US4] 일정 패널 높이를 현재 일자 콘텐츠 기준으로(빈 스크롤 제거) [artifact: src/components/trip/SwipeCarousel.tsx] [why: scroll]

## Phase 5: US5 — 선택 일자 URL 동기화 (Priority: P2)

- [x] T012 [US5] 선택 일자를 쿼리 파라미터에 반영(history replaceState) [artifact: src/components/trip/TripDetailLayout.tsx] [why: urlsync]
- [x] T013 [US5] 진입·새로고침 시 쿼리에서 선택 일자 복원(없으면 기본값) [artifact: src/app/trips/<id>/page.tsx] [why: urlsync]

## Phase 6: 검증 & 릴리즈

- [x] T014 전체 lint·typecheck·vitest 통과 확인 [artifact: specs/043-detail-revamp/quickstart.md] [why: layout]
- [ ] T015 towncrier 단편 작성(changes/720.feat·721.fix·722.fix·723.fix·724.feat — What/이유, 합쇼체) [artifact: changes/720.feat.md] [why: period-edit]

## Dependencies

- T001 → T002 → T003 (API → UI → 테스트)
- T004 → T005 → T006 (헤더 이관 → 액션바 → 삭제 버튼)
- T008 → T009 (열기 제거 → 회귀 가드)
- T010, T011 독립
- T012 → T013 (반영 → 복원)
- T014 마지막, T015 미체크 유지(release 소비)

## Notes

- T015 미체크 유지(towncrier 단편 — release build가 소비, drift 오탐 방지).
- US4 경계 멈춤 스크롤은 로컬 빌드 제약(jsdom/스크롤 엔진 부재)으로 정적·구조 검증만
  했고, 실기기 거동 검증은 후속이다. 데스크탑은 캘린더 sticky 고정으로 대응한다.
