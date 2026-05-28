---

description: "Task list — 여행 상세·목록 2분할 캘린더 레이아웃 + 연속 일자 가로 bar"
---

# Tasks: 여행 상세·목록 2분할 캘린더 레이아웃 + 연속 일자 가로 bar

**Input**: Design documents from `/specs/031-split-calendar-layout/`
**Prerequisites**: plan.md, spec.md

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

본 피처는 단일 Next.js 웹앱 변경. 신규 의존성 / 스키마 / 마이그레이션 없음. 자동 테스트 도입 없음(수동 시각 검증).

---

## Phase 3: User Story 1 — 여행 상세 2분할 (P1) 🎯 MVP

**Goal**: viewport ≥ 1024px 에서 `/trips/[id]` 본문이 좌-캘린더(50%) / 우-메타(50%) 두 컬럼으로만 보이고 가운데 영역이 사라진다.

**Independent Test**: `/trips/[id]` 진입 후 좌·우 두 컬럼 폭이 ±10% 이내, 가운데 컬럼 존재하지 않음.

- [ ] T001 [US1] `/trips/[id]/page.tsx` 본문 grid 를 `lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]` → `lg:grid-cols-2` 로 변경 [artifact: src/app/trips/<id>/page.tsx] [why: split-layout-detail] [multi-step: 2]
- [ ] T002 [US1] `TripDetailLayout` 데스크탑 분기에서 가운데 sidePane(트립 체크박스 + 선택 날짜 일정 패널 + placeholder + "+일정 추가") 제거. 캘린더만 본문 좌측 셀에 단독 노출 [artifact: src/components/trip/TripDetailLayout.tsx] [why: split-layout-detail]

---

## Phase 4: User Story 2 — 연속 일자 가로 bar (P1)

**Goal**: 캘린더에서 ≥ 2 일 연속된 여행 일자가 같은 행 안에서 끊김 없이 가로 bar 로 보인다. 다중 trip 모드는 색별 bar.

**Independent Test**: 6/7 ~ 6/21 trip 등록 후 6 월 캘린더에서 6/7 ~ 6/13(주 1), 6/14 ~ 6/20(주 2), 6/21(주 3) 각각 같은 행에서 색 bar 가 연결되어 보임.

- [ ] T003 [US2] `CalendarView` 셀 렌더링에 연속 일자 가로 bar 추가 — week row 단위로 시작·종료 셀 sliding 검사 후 배경 가로 bar 그리기 [artifact: src/components/trip/CalendarView.tsx::renderDayBar] [why: cell-bar] [multi-step: 2]
- [ ] T004 [US2] 단일 trip 모드는 단색 bar, 다중 trip 모드는 trip 별 색 매핑(spec 029 Stage 2 색 dot 매핑 승계) 사용해 색별 bar [artifact: src/components/trip/CalendarView.tsx::resolveBarColor] [why: cell-bar]

---

## Phase 5: User Story 3 — 셀 클릭 → Day 페이지 (P1)

**Goal**: 일정이 등록된 셀 클릭 시 1 회 화면 전이로 `/trips/[id]/day/[dayId]` 도달. 빈 셀은 클릭 비활성.

**Independent Test**: 등록된 일자 셀 클릭 → Day 페이지 라우팅 확인. 빈 셀 hover 시 클릭 시그널 없음.

- [ ] T005 [US3] `TripDetailLayout` 에서 `CalendarView.onSelect` 콜백을 setState 대신 `router.push(/trips/${tripId}/day/${dayId})` 로 변경. 빈 셀은 `onSelect` 가 호출되지 않도록 셀에 `aria-disabled` + 클릭 핸들러 가드 [artifact: src/components/trip/TripDetailLayout.tsx, src/components/trip/CalendarView.tsx::onSelect] [why: cell-routing-detail]

---

## Phase 6: User Story 4 — 목록 통합 캘린더 (P2)

**Goal**: `/trips` 좌측에 사용자가 속한 모든 trip 일자가 색별 bar 로 보이고, 우측에 기존 카드 목록. 캘린더 셀 클릭 → 해당 trip 상세.

**Independent Test**: 2 개 이상 trip 보유 사용자가 `/trips` 진입 시 좌측 캘린더에 두 trip 의 색별 bar 가 보이고, 셀 클릭 시 해당 trip 상세로 라우팅.

- [ ] T006 [US4] `TripsCalendar` 신규 컴포넌트 — `CalendarView` wrapper. props 로 trips[] (id, title, dates[], color) 받아 통합 캘린더 렌더 + 셀 클릭 시 target trip resolve 후 `router.push` [artifact: src/components/trip/TripsCalendar.tsx] [why: split-layout-list] [multi-step: 2]
- [ ] T007 [US4] `/trips/page.tsx` 본문 grid 를 `lg:grid-cols-2` 로 재구성. 좌측에 `TripsCalendar`, 우측에 기존 카드 목록 [artifact: src/app/trips/page.tsx] [why: split-layout-list]
- [ ] T008 [US4] 통합 캘린더 셀 → trip 상세 라우팅. 같은 셀에 trip 1 개면 그 trip, ≥ 2 개면 가까운 미래(startDate 가장 가까운) trip, 동일 날짜면 가장 최근 생성된 trip [artifact: src/components/trip/TripsCalendar.tsx::onSelect] [why: cell-routing-list] [multi-step: 2]
- [ ] T009 [US4] 셀 충돌 해소 헬퍼 `resolveTargetTrip(date, trips[])` 추출 — 단위 테스트 없이 inline 로직이라도 한 함수로 분리해 재사용 가능 [artifact: src/components/trip/TripsCalendar.tsx::resolveTargetTrip] [why: cell-routing-list]
- [ ] T010 [US4] `/trips/page.tsx` 서버 단계에서 사용자가 속한 모든 trip 의 `days[].date` 합산 데이터 로드 (기존 `prisma.trip.findMany` 결과에 `days: { select: { date: true } }` 추가) [artifact: src/app/trips/page.tsx::loadTripsCalendarData] [why: unified-calendar-feed]

---

## Phase 7: Release Bookkeeping

- [ ] T011 changes/608.feat.md 단편 추가 — What 한 문장 + Why 한 문장, 합쇼체. HOW 일체 금지 [artifact: changes/608.feat.md] [why: release-bookkeeping]
- [ ] T012 `quickstart.md` 작성 — Evidence(자동/수동) 명시. 수동 시각 검증 절차 5 단계 [artifact: specs/031-split-calendar-layout/quickstart.md] [why: release-bookkeeping]

---

## 의존성 / 순서

- T001 ↔ T002: T002 가 본문 grid 자식 컴포넌트(TripDetailLayout) 를 단순화하므로 T001 grid 변경 후 시각 확인 가능. 두 개 함께 묶어 한 커밋.
- T003 → T004: bar 렌더 함수 → 색 분기 순서.
- T005 는 T002 와 동일 파일 충돌 — T002 머지 후 T005.
- T006 → T007 → T008 → T009: 신규 컴포넌트 → 페이지 마운트 → 라우팅 → 충돌 헬퍼.
- T010 은 T007 과 동일 파일 — 같은 커밋에 묶음.
- T011 / T012 는 최종 커밋 직전.

## Checkpoint

- Phase 3 완료 = MVP. 사용자 시각 검증 1 차.
- Phase 4~5 완료 = 캘린더 가독성 + 라우팅 회복. 2 차 검증.
- Phase 6 완료 = `/trips` 페이지 정합. 3 차 검증.
- Phase 7 = release 단편 + Evidence.
