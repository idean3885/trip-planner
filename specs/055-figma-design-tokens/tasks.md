---
description: "Task list for spec 055 — Figma 디자인 토큰 전면 정합"
---

# Tasks: Figma 디자인 토큰 전면 정합

**Input**: Design documents from `/specs/055-figma-design-tokens/`
**Prerequisites**: plan.md, spec.md, quickstart.md

## Phase 1: US1 — 색 전수 → 시스템 팔레트 통일

- [x] T001 [US1] `:root`에 디자인 등장 프리미티브 팔레트 등재 — white·gray-50(#F5F5F5)/100(#EEEEEE)/200(#D9D9D9)/300(#B3B3B3)/600(#616161)/700(#333333)/800(#2F2F2F)/900(#212121)/950(#121212)·black·blue-500(#17A1FA)/700(#1270B0)·green-50(#F0FFD7)/600(#629126)/800(#335803)·pink-400(#FF8A9D) [artifact: src/app/globals.css] [why: palette-unify]
- [x] T002 [US1] shadcn 시맨틱 토큰을 디자인 정확 hex로 재매핑 — background #FFFFFF·foreground #121212·card/popover·primary #121212/foreground #FFFFFF·secondary/muted/accent #F5F5F5·muted-foreground #616161·border/input #D9D9D9·ring #17A1FA(무채색 oklch 제거) [artifact: src/app/globals.css] [why: palette-unify]

## Phase 2: US2 — 캘린더 셀/헤더 상태색 재배선

- [x] T003 [US2] 캘린더 시맨틱 토큰 신설(`:root`) — `--cal-saturday`·`--cal-sunday`·`--cal-weekday-header`·`--cal-trip-weekend`·`--cal-trip-weekend-dark`·`--cal-selected-bg`·`--cal-selected-text`·`--cal-today-border`·`--cal-inactive`·`--cal-inactive-strong`·`--cal-weekend-inactive`·`--cal-fill-weekend`·`--cal-fill-weekday` (Atoms 8변형 추출값) [artifact: src/app/globals.css] [why: calendar-recolor]
- [x] T004 [US2] CalendarView 셀/헤더 분기 재배선 — 토=파랑/일=초록/평일헤더=그레이, 여행주말=초록 텍스트, 선택=연녹 배경, 오늘=테두리, 기간밖=그레이(현 bg-primary/bg-primary/10 단순 분기 대체) [artifact: src/components/trip/CalendarView.tsx] [why: calendar-recolor]

## Phase 3: US3 — 타이포·radius·동행 배너

- [x] T005 [US3] Inter를 `--font-sans`/`--font-heading` 변수로 연결(next/font variable 노출 + @theme inline 참조) [artifact: src/app/layout.tsx] [why: typo-radius]
- [x] T006 [US3] `--radius` 8px 기준 정렬 + 동행 배너 토큰(#F0FFD7/#2F2F2F) 정합, 캘린더 셀 4px 명시 [artifact: src/app/globals.css] [why: typo-radius]

## Phase 4: US4 — 토큰 하네스 정합

- [x] T007 [US4] 색 정본 위치 명문화 — design/tokens.json `_allowlist` 설명 갱신(프리미티브+시맨틱+캘린더 색은 :root 정본) + audit-tokens 신규 색 토큰과 정합 [artifact: scripts/audit-tokens.ts] [why: harness-align]
- [x] T008 [US4] build-tokens 센티넬이 신규 색 체계와 어긋나지 않게 정합 + tokens-presence 테스트에 신규 색·캘린더 토큰 존재 검사 추가 [artifact: tests/lib/tokens/tokens-presence.test.ts] [why: harness-align]

## Phase 5: 검증 & 릴리즈

- [x] T009 캘린더 셀 색 분기·동행 배너 렌더 회귀/신규 테스트 [artifact: tests/components/trip/calendar-design-tokens.test.tsx] [why: verify]
- [x] T010 전체 lint·typecheck·`npx vitest run` + 커버리지 100% + quickstart Evidence 기록 [artifact: specs/055-figma-design-tokens/quickstart.md] [why: verify]
- [ ] T011 towncrier 단편 작성(changes/752.feat.md) [artifact: changes/752.feat.md] [why: palette-unify]

## Dependencies

- T001 → T002 (프리미티브 → 시맨틱 매핑)
- T003 → T004 (캘린더 토큰 → CalendarView 적용)
- T005/T006 는 T001/T002 후(팔레트 토큰 참조)
- T007/T008 는 토큰 확정(T001~T006) 후
- T009 구현 후, T010 마지막
- T011 미체크 유지(towncrier 단편 — release build 소비)

## Notes

- 색은 전부 토큰 경유 — 하드코딩 hex 금지. 색 정본은 `:root`.
- 라이트 전용 — `.dark` 블록·다크 토글 도입 금지.
- 다크/핑크 배경색은 팔레트 토큰으로 등재만(미적용).
- 활동 카테고리 칩(이동/숙소)은 범위 밖 — 기존 유지.
- T011 미체크 유지(towncrier 단편 — release build 소비).
