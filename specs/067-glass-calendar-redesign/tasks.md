# Tasks: 글래스 캘린더 재설계 + 글래스 카드 테두리 버그 수정

**Feature**: `067-glass-calendar-redesign` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

## Phase 1: Setup
- [x] T001 대상 확인 (`card.tsx`, `globals.css` `.trip-cal`, `CalendarView.tsx`, `calendar.tsx`)

## Phase 2: US1 — 글래스 카드 테두리 버그 수정 (P1)
- [x] T002 [US1] 글래스 카드에서 `overflow-hidden` 제거(비글래스는 유지) — backdrop-filter 클립 충돌 해소, border-radius 라운딩은 유지 [artifact: src/components/ui/card.tsx] [why: card-artifact]

## Phase 3: US2 — 캘린더 글래스 재설계 (P1)
- [x] T003 [US2] 캘린더 글래스 토큰 신설 — `--cal-range-band`/`--cal-selected-glass`/`--cal-ring` (`:root`, 하드코딩 금지) [artifact: src/app/globals.css] [why: cal-glass]
- [x] T004 [US2] `.trip-cal`(월 뷰) 재설계 — 선택=틴트+링, 오늘=링, 기간=반투명 밴드(주 첫/끝 둥글게), `after:bg-primary` 밑줄 제거 [artifact: src/app/globals.css] [why: cal-glass]
- [x] T005 [US2] `CalendarView` 주간 렌더러 + 월 range modifier 글래스화(밑줄→밴드, 선택/오늘 링) [artifact: src/components/trip/CalendarView.tsx] [why: cal-glass]
- [x] T006 [US2] `calendar.tsx` range data-클래스를 밴드 배경/라운딩으로 정렬(솔리드 range 필 제거) [artifact: src/components/ui/calendar.tsx] [why: cal-glass]

## Phase 4: US3 — 캘린더 사이즈 (P2)
- [x] T007 [US3] `calendar.tsx` 셀 `aspect-square` → 낮은 종횡비로 축소(하단 잉여 공간 감소) [artifact: src/components/ui/calendar.tsx] [why: cal-size]

## Phase 4b: 헤더 정리
- [x] T012 헤더를 `SiteHeader` 클라이언트 컴포넌트로 분리해 대문(`/`)에서 숨긴다(앱 페이지 유지) [artifact: src/components/SiteHeader.tsx|src/app/layout.tsx] [why: chrome-header]

## Phase 5: Polish
- [x] T008 [P] 글래스 캘린더 회귀 테스트 — 카드 overflow 제거, 캘린더 토큰 존재, 선택/오늘/기간 스타일 전환, 셀 종횡비 검증 [artifact: tests/components/glass-calendar.test.tsx] [why: cal-glass]
- [x] T009 색상 가드 확인 — 신규 색 전량 `:root` 토큰 경유 (lint/color-guard)
- [x] T010 quickstart Evidence 자동 테스트 통과 확인 (`npx vitest run`)
- [ ] T011 towncrier 단편 작성 (release 단계 소비, 미체크 유지) [artifact: changes/932.feat.md] [why: cal-glass]

## Dependencies
- Setup → US1·US2·US3 → Polish. 토큰(T003)이 T004·T005·T006 선행.

## Parallel Opportunities
- US1(T002)·US3(T007)은 US2와 독립. T008 테스트는 구현 후.

## MVP Scope
US1(카드 버그) + US2(캘린더 글래스)가 핵심. US3(사이즈)는 증분.
