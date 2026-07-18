# Tasks: 여행 상세 마감 배치

**Feature**: `068-detail-polish-fixes` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

## Phase 1: Setup
- [x] T001 대상 파일 확인

## Phase 2: US1 — 브레드크럼 (P1)
- [x] T002 [US1] 여행 상세 브레드크럼 '여행 목록' 링크 `href="/"`→`/trips` in `src/app/trips/<id>/page.tsx` [artifact: src/app/trips/<id>/page.tsx] [why: breadcrumb-fix]

## Phase 3: US2 — 카드 테두리 근본 수정 (P1)
- [x] T003 [US2] 카드 `ring-1 ring-foreground/15`→`border border-foreground/10`(박스모델, overflow 클립 회피) [artifact: src/components/ui/card.tsx] [why: card-border]
- [x] T004 [US2] `.glass-surface`/`.glass-overlay`의 `border-color` 제거 + 헤더·푸터 border 정합 [artifact: src/app/globals.css|src/components/SiteHeader.tsx|src/components/Footer.tsx] [why: card-border]

## Phase 4: US3 — 캘린더 블렌딩·사이즈 (P2)
- [x] T005 [US3] 캘린더 래퍼를 투명+`backdrop-blur`로(흰 글래스 박스·ring·shadow 제거, sticky 유지) [artifact: src/components/trip/TripDetailLayout.tsx] [why: calendar-blend]
- [x] T006 [US3] 캘린더 셀 종횡비 추가 축소 [artifact: src/components/ui/calendar.tsx] [why: calendar-blend]

## Phase 5: US4 — 일정 표시 (P2)
- [x] T007 [US4] 일정 있는 날 표시 연결 바→점(dot) (주간·월·SingleTrip) [artifact: src/components/trip/CalendarView.tsx] [why: activity-dot]
- [x] T008 [US4] 여행 기간 밴드 시작·끝만 라운딩·가운데 연속 [artifact: src/app/globals.css] [why: activity-dot]

## Phase 6: Polish
- [x] T009 [P] 회귀 테스트 — 브레드크럼 href, 카드 border, 캘린더 투명, dot, 기간 라운딩 [artifact: tests/components/detail-polish.test.tsx] [why: card-border]
- [x] T010 색상 가드·자가검증 (`npx vitest run`)
- [ ] T011 towncrier 단편 (release 단계 소비, 미체크 유지) [artifact: changes/934.fix.md] [why: breadcrumb-fix]

## Dependencies
Setup → US1~US4 → Polish.

## MVP Scope
US1(브레드크럼)·US2(카드 테두리)가 버그 수정 핵심. US3·US4는 마감.
