---
description: "Task list — 여행 상세 캘린더 중심 단일 화면 재설계"
---

# Tasks: 여행 상세 캘린더 중심 단일 화면 재설계

**Input**: Design documents from `/specs/032-calendar-centric-detail/`
**Prerequisites**: plan.md, spec.md

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

단일 Next.js 웹앱 변경. 신규 의존성 / 스키마 / 마이그레이션 없음. 변경 컴포넌트는 Vitest + Testing Library 단위/상호작용 테스트 동반.

---

## Phase 3: User Story 1 — 날짜 선택 인라인 조회 (P1) 🎯 MVP

**Goal**: 캘린더 셀 클릭 시 URL 이동 없이 선택 상태만 갱신해 그 날짜의 일정을 같은 화면 패널에 표시한다. 진입 시 기본 선택 날짜의 일정이 이미 보인다.

**Independent Test**: `/trips/[id]`에서 서로 다른 날짜 클릭 시 URL 불변 + 패널만 갱신. 진입 직후 기본 선택 날짜(여행 기간 내 오늘/첫날) 일정 표시.

- [x] T001 [US1] `TripDetailLayout`을 client orchestrator로 전환 — `selectedDate` + `days`(activities 포함) 클라이언트 상태 보유. `CalendarView.onSelect`를 `router.push` 제거하고 `setSelectedDate`로 교체. 초기 `selectedDate`는 `trip-period.ts` derived 기간으로 여행 기간 내 오늘(없으면 첫날) 계산 [artifact: src/components/trip/TripDetailLayout.tsx] [why: inline-select] [multi-step: 2]
- [x] T002 [US1] `CalendarView` 셀 클릭이 라우팅이 아닌 `onSelect(date)`만 호출하도록 정리하고, 선택 날짜를 `selected` 모디파이어로 시각 강조. 빈 날짜도 선택 가능(빈 상태 안내로 연결) [artifact: src/components/trip/CalendarView.tsx::onSelect] [why: inline-select]
- [x] T003 [P] [US1] `TripDetailLayout` 초기 선택일 계산(`computeInitialSelected`) 단위 테스트 [artifact: tests/components/trip/TripDetailLayout.test.tsx] [why: inline-select]

---

## Phase 4: User Story 2 — 선택 날짜 인라인 CRUD (P1)

**Goal**: 선택 날짜 패널에서 일정 추가·수정·삭제까지 페이지 이동 없이 처리한다. 빈 날짜는 추가 시 Day 자동 생성.

**Independent Test**: 선택 패널에서 일정 추가→목록 즉시 반영, 수정→내용 갱신, 삭제→목록 제거. 모두 URL 불변. 빈 날짜 추가 시 Day 생성 후 일정 추가.

- [x] T004 [US2] `DayActivitiesPane`을 인라인 편집 가능하게 확장 — day 페이지 `Link` 제거, 선택 날짜의 매칭 Day activities를 `ActivityList`로 렌더 [artifact: src/components/trip/DayActivitiesPane.tsx] [why: inline-activity-crud] [multi-step: 3]
- [x] T005 [US2] 빈 날짜 Day 생성을 상위 `days` 상태에 반영해 캘린더 일정 표시와 동기화 — `handleDayCreated`로 신규 Day 를 days 에 추가·정렬. 기존 Day 의 활동 CRUD 는 `ActivityList` 자체 상태로 처리(캘린더 dot 은 Day 존재 기준이라 추가 동기화 불필요) [artifact: src/components/trip/TripDetailLayout.tsx::handleDayCreated] [why: inline-activity-crud]
- [x] T006 [US2] 빈 선택 날짜에서 일정 추가 시 `POST /days`로 Day 자동 생성 후 일정 추가하는 흐름 — 선택 패널 "일정 추가"가 매칭 Day 없을 때 Day 생성→days 반영→activity 추가를 순차 처리 [artifact: src/components/trip/DayActivitiesPane.tsx::handleCreateDay] [why: inline-activity-crud]
- [x] T007 [P] [US2] 인라인 CRUD 상호작용 테스트 — 빈 날짜 Day 자동 생성·day 있을 때 활동 렌더·권한 분기 [artifact: tests/components/trip/DayActivitiesPane.test.tsx] [why: inline-activity-crud]

---

## Phase 5: User Story 3 — 데스크탑 2분할 재배치 (P1)

**Goal**: viewport ≥ 1024px에서 좌측(캘린더 확대 + 동기화 카드) / 우측(동행자 + 선택 일정) 배치. DayList 미노출.

**Independent Test**: ≥ 1024px에서 좌측 캘린더가 컬럼 폭을 채우고 그 아래 동기화 카드, 우측 상단 동행자 + 하단 선택 일정. DayList 요소 0개.

- [x] T008 [US3] `/trips/[id]/page.tsx` 2열 배치 재구성 — `SidePanel`(동기화+동행자 묶음)을 해체·삭제하고, 동기화 카드·동행자를 `CalendarSyncEntryCard`·`MemberList`로 직접 만들어 `TripDetailLayout`의 syncCard·memberList prop 으로 전달. 좌(캘린더+동기화)/우(동행자+선택 일정) 배치는 TripDetailLayout 데스크탑 분기가 처리 [artifact: src/app/trips/<id>/page.tsx] [why: desktop-layout] [multi-step: 2]
- [x] T009 [US3] 좌측 캘린더가 컬럼 폭을 채우도록 `CalendarView` 데스크탑 폭/셀 크기 확대(`desktopFull`) [artifact: src/components/trip/CalendarView.tsx::desktopFull] [why: desktop-layout]
- [x] T010 [US3] `TripDetailLayout`에서 DayList 렌더 블록 제거 [artifact: src/components/trip/TripDetailLayout.tsx::DayList] [why: daylist-removal]

---

## Phase 6: User Story 4 — 모바일 sticky 캘린더 + 압축 (P2)

**Goal**: viewport < 1024px에서 캘린더 상단 sticky + 위로 스와이프 월→주 압축. 동기화·동행자는 `자세히` 진입점에 모은다.

**Independent Test**: < 1024px에서 캘린더 상단 고정, 위로 스와이프 시 선택 주 1줄로 압축, 아래로 스와이프 시 월 복귀. 동기화·동행자가 본문에 펼쳐지지 않고 `자세히`로 진입.

- [x] T011 [US4] `CalendarView` 모바일 sticky 컨테이너 + `react-swipeable` `onSwipedUp`/`onSwipedDown`으로 `month`↔`week` 표시 모드 토글. 주 모드는 선택 날짜가 속한 한 주만 렌더 [artifact: src/components/trip/CalendarView.tsx::mobileCompact] [why: mobile-calendar] [multi-step: 2]
- [x] T012 [P] [US4] 월↔주 모드 + 선택 주 계산(`getWeekDays`) 단위 테스트 [artifact: tests/components/trip/CalendarView.test.tsx] [why: mobile-calendar]
- [x] T013 [US4] 모바일 캘린더 상단 sticky 바의 `자세히` 버튼 — 탭 시 동기화 카드 + 동행자를 펼침(접힘 기본). 본문에 별도 진입 카드를 두지 않음. 데스크탑은 미노출. Sheet 신규 vendoring 대신 토글로 처리해 중첩 다이얼로그 회피 [artifact: src/components/trip/TripDetailLayout.tsx] [why: mobile-detail-entry]

---

## Phase 7: Day 페이지 제거

**Goal**: `/trips/[id]/day/[dayId]` 라우트 제거 + 상세로 리다이렉트.

**Independent Test**: 기존 day 경로 직접 접근 시 `/trips/[id]`로 이동.

- [x] T014 `src/app/trips/[id]/day/[dayId]/page.tsx`를 `redirect("/trips/[id]")`로 교체. day 페이지로 향하던 잔여 `Link`(DayActivitiesPane 등) 제거 확인 [artifact: src/app/trips/<id>/day/<dayId>/page.tsx] [why: day-route-removal]

---

## Phase 8: Release Bookkeeping

- [x] T015 `changes/622.feat.md` 단편 추가 — What 한 문장 + Why 한 문장, 합쇼체. HOW 일체 금지 [artifact: changes/622.feat.md] [why: release-bookkeeping]
- [x] T016 `quickstart.md` 작성 — Evidence(자동 `npx vitest run` + 수동 시각 검증) 명시 [artifact: specs/032-calendar-centric-detail/quickstart.md] [why: release-bookkeeping]
- [x] T017 spec 031 회귀 테스트(`layout-classes.test.ts`) 갱신 — SidePanel 해체·셀 클릭 라우팅 제거·DayList 제거·day 페이지 redirect 정합 [artifact: tests/app/trips-id/layout-classes.test.ts] [why: release-bookkeeping]

---

## 의존성 / 순서

- T001 → T002 → T003: 선택 상태 리프팅 → 캘린더 onSelect 정리 → 테스트.
- T004 → T005 → T006 → T007: 패널 확장 → CRUD 상위 동기화 → 빈 날짜 Day 생성 → 테스트.
- T008 ↔ T009 ↔ T010: 동일 파일군(page/SidePanel/TripDetailLayout) — 레이아웃 재배치는 한 묶음으로 커밋.
- T011 → T012 → T013: 모바일 캘린더 압축 → 테스트 → 자세히 진입점.
- T014는 T004(잔여 Link 제거) 이후.
- T015~T017은 최종 커밋 직전.

## Checkpoint

- Phase 3~4 완료 = MVP(인라인 선택 + CRUD). 1차 검증.
- Phase 5 완료 = 데스크탑 레이아웃 정리 + DayList 제거. 2차 검증.
- Phase 6 완료 = 모바일 캘린더 정합. 3차 검증.
- Phase 7~8 = day 라우트 제거 + 단편 + Evidence + 회귀.
</content>
