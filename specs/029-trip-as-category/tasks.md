# Tasks — Spec 029 (여행을 일정 카테고리로 재정의 + 캘린더 형태 뷰)

Phase 2 산출. plan Coverage Targets bullet의 `[why]` 태그를 모든 태스크에 부착해 자동 검증과 연결합니다. 메타태그 4종(`[artifact]`·`[why]`·`[multi-step]`·`[migration-type]`) 강제.

세 release 단계로 분해: **expand(v2.17.0)** → **migrate(v2.18.0)** → **contract(v3.0.0)**.

## Stage 1 — expand (v2.17.0)

명목 컬럼 유지 + derived 헬퍼 도입. 응답·UI 호환. user-facing 변화 없음.

- [ ] T001 derived 기간 헬퍼 도입 — `getDerivedPeriod(tripId)`가 `min/max(Day.date)` aggregate로 시작·종료를 반환 [artifact: src/lib/trip-period.ts] [why: trip-derived-expand]
- [ ] T002 derived 헬퍼 단위 테스트 — 일정 0건 null, 1건 단일 일자, N건 min/max 케이스 [artifact: tests/lib/trip-period.test.ts] [why: trip-derived-expand]
- [ ] T003 기존 trip 데이터 보정 검증 — 모든 trip의 명목 startDate/endDate가 derived 값과 정합한지 일회성 스크립트로 데이터 보정 점검(차이 있으면 리포트) [artifact: scripts/verify-trip-period-alignment.ts] [why: trip-derived-expand] [migration-type: data-migration]

## Stage 2 — migrate (v2.18.0)

코드 호출처를 derived로 전환. 캘린더 UI 도입(US2). 통합 캘린더 + 체크박스 도입(US3).

### derived 호출처 전환

- [x] T010 read-path `computeDayNumber`/`withDayNumber`/`withSortOrder` 호출처(v1/v2 days list·single GET, 트립 상세 SSR, 일자 상세 SSR)를 derived startDate 인자로 전환. write-path(`expandTripRangeIfNeeded`)는 명목 컬럼 갱신을 v3.0.0 contract까지 안전망으로 유지 [artifact: src/app/trips/<id>/page.tsx] [why: trip-derived-migrate]
- [x] T011 trips 단건 응답에 `getResolvedPeriod` fallback 헬퍼 도입 — derived 우선, 일정 0건이면 명목 fallback. v2 목록 라우트는 신설하지 않고 v1 그대로(현행 응답 스키마 호환) [artifact: src/lib/trip-period.ts::getResolvedPeriod] [why: trip-derived-migrate]
- [x] T012 GET /api/v2/trips/<id> · GET /api/trips/<id> 응답을 derived 기간으로 전환 (fallback 헬퍼 호출) [artifact: src/app/api/v2/trips/<id>/route.ts] [why: trip-derived-migrate]
- [x] T013 외부 캘린더 import 기간을 derived로 전환 — 일정 0건 trip은 `EmptyTripPeriodError` → 422 `empty_trip_period` 응답으로 차단 (FR-015) [artifact: src/lib/calendar-import/service.ts::EmptyTripPeriodError] [why: external-cal-derived]
- [x] T014 공유 캘린더 push 는 trip 기간을 직접 select하지 않고 활동(`Activity.startTime`/`endTime`) 단위로 처리. derived 정책의 영향 범위 밖이라 코드 변경 없음. 회귀 가드는 T015 통합 테스트가 service 모듈에서 trip period select 패턴 재진입을 차단 [artifact: src/lib/calendar/service.ts] [why: external-cal-derived]
- [x] T015 derived 전환 통합 테스트 — trip 헤더(v2/v1)·외부 캘린더 import·공유 캘린더 push 4축이 derived 정책에 정합 [artifact: tests/integration/trip-derived-period.test.ts] [why: trip-derived-migrate]

### 캘린더 UI

- [x] T020 shadcn Calendar 컴포넌트 vendor — `npx shadcn add calendar` + ko 로케일 적용 [artifact: src/components/ui/calendar.tsx] [why: calendar-view-month]
- [x] T021 월별 미니 캘린더 컴포넌트 — 여행 기간 강조 + 오늘 강조 + modifiers slot(통합 캘린더 다중 색 dot 대비) [artifact: src/components/trip/CalendarView.tsx] [why: calendar-view-month]
- [x] T022 일자 일정 리스트 pane — 사이드(desktop)·하단(mobile) 양쪽에서 재사용 [artifact: src/components/trip/DayActivitiesPane.tsx] [why: calendar-desktop-split]
- [x] T023 여행 상세 레이아웃 — desktop split / mobile stacked 분기 (viewport 1024px) [artifact: src/components/trip/TripDetailLayout.tsx] [why: calendar-desktop-split]
- [x] T024 mobile in-place swap shell — react-swipeable hook + 좌 스와이프 뒤로 + "뒤로" 버튼 + ESC (a11y) [artifact: src/components/trip/MobileSwipeShell.tsx] [why: calendar-mobile-stacked]
- [x] T025 mobile swap 컴포넌트 테스트 — default/swap 전환·뒤로 버튼·ESC·비활성 시 키 무시 [artifact: tests/components/trip/MobileSwipeShell.test.tsx] [why: calendar-mobile-stacked]
- [x] T026 여행 상세 page.tsx에 새 레이아웃 적용 — 기존 일정 카드 리스트를 TripDetailLayout로 교체 [artifact: src/app/trips/<id>/page.tsx] [why: calendar-desktop-split]

### 통합 캘린더

- [x] T030 여행 라벨 palette pool 디자인 토큰 추가 — 6색(Tailwind 700 단계, WCAG AA 4.5:1 이상) `--trip-palette-1`~`--trip-palette-6` [artifact: src/app/globals.css] [why: calendar-multi-trip]
- [x] T031 `getTripColor(tripId)` 함수 — Trip ID 기반 hash로 결정적 색 부여 (음수/NaN fallback) [artifact: src/lib/trip-palette.ts::getTripColor] [why: calendar-multi-trip]
- [x] T032 사이드 트립 체크박스 컴포넌트 — 사용자 속한 여행 목록 + 색 dot + native input checkbox [artifact: src/components/trip/TripCheckboxes.tsx] [why: calendar-multi-trip]
- [x] T033 사용자 prefs wrapper — localStorage(`trip-planner:prefs:v1:`) typed read/write + finite/dedup 정규화 + JSON 파손 fallback [artifact: src/lib/user-prefs.ts] [why: calendar-multi-trip]
- [x] T033A 통합 — TripDetailLayout 사이드 + mobile 상단에 체크박스 노출, 현재 trip 강제 체크, prefs 마운트 시 복원·토글 즉시 저장, 다른 trip 일정 날짜 lazy fetch + 캘린더 dot union (색별 분리 dot + 일정 카드 trip 라벨은 follow-up #595) [artifact: src/components/trip/TripDetailLayout.tsx] [why: calendar-multi-trip]
- [x] T034 CalendarView 색별 분리 dot — react-day-picker `components.DayButton` custom render 로 trip 별 색 dot row(최대 3개 + 초과 시 "+N"). 단일 trip 모드에서는 기존 hasActivity 단일 dot fallback [artifact: src/components/trip/CalendarView.tsx::MultiTripDayButton] [why: calendar-multi-trip]
- [x] T035 DayActivitiesPane / 일정 카드 trip 라벨 — `groups` prop 으로 trip 별 일정 분리 노출. 다중 trip 모드는 색 dot + trip 제목 chip 라벨. 단일 trip 모드는 라벨 자동 숨김 [artifact: src/components/trip/DayActivitiesPane.tsx] [why: calendar-multi-trip]
- [x] T036 TripDetailLayout 다른 trip 일정 fetch + 통합 — `GET /api/v2/trips/<id>` 로 days+activities 한 번에 fetch, otherTripsCache Map 으로 캐시. tripsDays/dayGroups 가공해 CalendarView/DayActivitiesPane 에 전달 (spec FR-014 충족) [artifact: src/components/trip/TripDetailLayout.tsx::otherTripsCache] [why: calendar-multi-trip]

### 일정 0건 UX

- [x] T040 trip 목록 카드 derived 기간 노출. 일정 0건은 "일정 미정". N+1 회피 위해 groupBy 1회로 일괄 fetch [artifact: src/app/trips/page.tsx] [why: empty-trip-ux]
- [x] T041 일정 0건 trip의 캘린더 dot 미노출(자연 정합) + 상단 안내 카드 + 트립 헤더 기간을 isDerived 분기로 "일정 미정" 표시 [artifact: src/components/trip/TripDetailLayout.tsx] [artifact: src/app/trips/<id>/page.tsx] [why: empty-trip-ux]

## Stage 3 — contract (v3.0.0)

명목 컬럼 제거 + MCP breaking. spec 030(자동 부트스트랩)과 동시 출시.

- [ ] T050 Prisma 마이그레이션 — `Trip.startDate`/`endDate` 컬럼 DROP [artifact: prisma/migrations/<ts>-trip-period-contract/migration.sql] [why: trip-derived-contract] [migration-type: schema-only]
- [ ] T050A 마이그레이션 직전 데이터 보정 검증 — derived 값이 모든 trip에 대해 정상 동작하는지 확인 후 컬럼 DROP 실행. 사고 시 rollback 절차 검증 [artifact: scripts/verify-trip-period-contract-readiness.ts] [why: trip-derived-contract] [migration-type: data-migration]
- [ ] T051 Prisma schema에서 startDate/endDate 필드 제거 [artifact: prisma/schema.prisma] [why: trip-derived-contract]
- [ ] T052 MCP `create_trip` 시그니처 — startDate/endDate 파라미터 제거 [artifact: mcp/trip_mcp/tools/create_trip.py] [why: mcp-trip-signature-breaking]
- [ ] T053 MCP `update_trip` 시그니처 — startDate/endDate 파라미터 제거 [artifact: mcp/trip_mcp/tools/update_trip.py] [why: mcp-trip-signature-breaking]
- [ ] T054 OpenAPI Trip 스키마 갱신 — 명목 컬럼 참조 제거 [artifact: src/lib/openapi.ts] [why: mcp-trip-signature-breaking]

## Quickstart 자동 검증

- [ ] T999 quickstart Evidence 명령 실행 — vitest·typecheck·lint·MCP 시그니처 테스트 [artifact: specs/029-trip-as-category/quickstart.md] [why: trip-derived-migrate]
