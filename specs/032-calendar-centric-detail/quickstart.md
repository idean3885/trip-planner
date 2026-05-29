# Quickstart: 여행 상세 캘린더 중심 단일 화면 재설계

**Feature**: `032-calendar-centric-detail` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

선택 상태 기반 인라인 표시·CRUD는 Vitest + Testing Library 로 자동 회귀, 반응형 레이아웃(데스크탑 2분할·모바일 sticky/스와이프)은 브라우저 수동 시각 검증으로 확인한다.

## US1 — 날짜 선택 인라인 조회

### Scenario US1-1: 진입 시 기본 선택 날짜 일정 표시
`/trips/<id>` 진입 시 여행 기간 내 오늘(없으면 첫날)이 선택되고 그 날짜의 일정이 패널에 이미 보인다.

### Scenario US1-2: 날짜 클릭이 페이지 이동 없이 패널만 갱신
캘린더에서 다른 날짜를 클릭하면 URL 경로가 그대로이고 일정 패널만 그 날짜로 갱신된다.

### Evidence
- 자동 테스트: `tests/components/trip/TripDetailLayout.test.tsx` — `computeInitialSelected` 가 기간 내 오늘 / 기간 밖 첫날 / 0건 오늘을 반환.
- 수동 체크리스트:
  - [x] 진입 직후 기본 선택 날짜 일정이 패널에 보임
  - [x] 다른 날짜 클릭 시 URL 불변, 패널만 갱신

## US2 — 선택 날짜 인라인 CRUD

### Scenario US2-1: 추가·수정·삭제가 같은 화면에서 완료
선택 날짜 패널에서 일정을 추가·수정·삭제해도 페이지 이동 없이 목록이 갱신된다.

### Scenario US2-2: 빈 날짜 추가 시 Day 자동 생성
일정이 없는 날짜에서 "일정 추가" 시 먼저 해당 날짜의 Day 가 생성되고 일정을 이어 추가한다.

### Scenario US2-3: 기존 day 경로 리다이렉트
`/trips/<id>/day/<dayId>` 직접 접근 시 `/trips/<id>` 로 이동한다.

### Evidence
- 자동 테스트:
  - `tests/components/trip/DayActivitiesPane.test.tsx` — 빈 날짜 "일정 추가" → `POST /days` 후 `onDayCreated` 호출, 로컬 YYYY-MM-DD 전송, day 있으면 활동 목록 렌더.
  - `tests/components/ActivityList.test.tsx` — 활동 추가·수정·삭제(기존, 재사용 경로).
  - `tests/app/trips-id/layout-classes.test.ts` — day 페이지가 `redirect` 로 축소·ActivityList 직접 렌더 제거.
- 수동 체크리스트:
  - [x] 일정 추가/수정/삭제 후 패널 즉시 갱신, URL 불변
  - [x] 빈 날짜 추가 → Day 생성 후 활동 추가 가능
  - [x] 기존 day URL 접근 시 상세로 이동

## US3 — 데스크탑 2분할 재배치

### Scenario US3-1: 좌(캘린더+동기화) / 우(동행자+선택 일정)
viewport ≥ 1024px 에서 좌측에 확대된 캘린더와 동기화 카드, 우측에 동행자와 선택 날짜 일정이 보인다. day 목록은 없다.

### Evidence
- 자동 테스트: `tests/app/trips-id/layout-classes.test.ts` — TripDetailLayout `lg:grid-cols-2`·`desktopFull`, page.tsx 가 SidePanel 미import·syncCard/memberList prop 전달, DayList 미참조.
- 수동 체크리스트:
  - [x] 1440px 에서 좌측 캘린더가 컬럼 폭을 채움(과도한 여백 없음)
  - [x] 좌측 하단 동기화 카드 / 우측 상단 동행자 / 우측 하단 선택 일정
  - [x] day 목록 요소 0개

## US4 — 모바일 sticky 캘린더 + 압축

### Scenario US4-1: 캘린더 sticky + 위로 스와이프 시 주 압축
viewport < 1024px 에서 캘린더가 상단 고정되고, 위로 스와이프하면 선택 주 1줄로 압축, 아래로 스와이프하면 월 표시로 복귀한다.

### Scenario US4-2: 동기화·동행자는 자세히
동기화·동행자가 본문에 펼쳐지지 않고 캘린더 상단 바의 `자세히` 로 노출된다.

### Evidence
- 자동 테스트: `tests/components/trip/CalendarView.test.tsx` — `getWeekDays` 선택 주 7일(일요일 시작) 계산, `enableMobileCompact` 기본 월 표시 시작.
- 수동 체크리스트:
  - [x] 390px 에서 캘린더 상단 고정
  - [x] 위로 스와이프 → 선택 주 1줄 압축, 아래로 → 월 복귀
  - [x] `자세히` 탭 시 동기화 카드 + 동행자 노출
