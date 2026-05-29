---
description: "Task list — 외부 캘린더 가져오기 선택 + 시간·타임존 일괄 + 미저장 미리보기"
---

# Tasks: 외부 캘린더 가져오기 — 선택 + 시간·타임존 일괄 + 미저장 미리보기

**Input**: Design documents from `/specs/033-calendar-sync-selection/`
**Prerequisites**: plan.md, spec.md

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

단일 Next.js 웹앱 변경. 스키마/마이그레이션/신규 의존성 없음. 기존 import/draft/promotion 인프라 재사용. 변경분은 Vitest + Testing Library 동반.

---

## Phase 3: User Story 1 — 가져온 일정 선택 (P1) 🎯 MVP

**Goal**: 가져온 draft 목록을 체크박스로 전체/부분 선택한다. 진입 시 전체 선택.

**Independent Test**: 일부 체크 해제 후 선택 수가 줄고, 전체 토글로 전체 선택/해제가 토글되는지 확인.

- [x] T001 [US1] `DraftSection`에 draft별 체크박스 + 선택 상태(클라) 추가. 진입 시 전체 선택 [artifact: src/components/calendar-sync/sections/DraftSection.tsx] [why: draft-selection] [multi-step: 2]
- [x] T002 [US1] 상단 "전체 선택" 토글 + 선택 수 표시. 전체 켬/끔이 모든 항목에 반영 [artifact: src/components/calendar-sync/sections/DraftSection.tsx::selectAll] [why: draft-selection]
- [x] T003 [P] [US1] 선택/전체토글 상호작용 테스트 [artifact: tests/components/calendar-sync/DraftSection.test.tsx] [why: draft-selection]

---

## Phase 4: User Story 2 — 상단 고정 확정 버튼 + 일괄 영역 (P1)

**Goal**: 확정 버튼과 일괄 설정을 상단 sticky로 고정, draft 목록만 스크롤.

**Independent Test**: 항목이 많아 목록을 스크롤해도 확정 버튼·일괄 영역이 계속 보임.

- [x] T004 [US2] DraftSection 헤더(확정 버튼 + 시간 미정 일괄 시작 + 타임존 일괄)를 `sticky top-0`로 고정하고 목록만 스크롤. 확정 버튼 최상단, 그 아래 일괄 설정 [artifact: src/components/calendar-sync/sections/DraftSection.tsx::stickyHeader] [why: sticky-header]

---

## Phase 5: User Story 3 — 미저장 보정 + 개별 수정 + 일괄 확정 (P1)

**Goal**: 클라 미리보기에서 시간/타임존 일괄·개별 보정 후, 선택분을 일괄 확정해 정식 일정 저장.

**Independent Test**: 일괄 시작 시간·타임존 적용 + 일부 개별 수정 후 확정 → 보정값으로 선택분 저장.

- [x] T005 [US3] 시간 미정 일괄 시작 — `isAllDay`/시간 미지정 draft의 `startTime`을 날짜+일괄 시각으로 클라 보정. 시간 있는 draft 불변 [artifact: src/components/calendar-sync/sections/DraftSection.tsx::applyBatchStartTime] [why: batch-time-tz] [multi-step: 2]
- [x] T006 [US3] 타임존 일괄 — 시간 있는 draft의 표시 시각 숫자 유지하고 `startTimezone`/`endTimezone`만 교체(`startTime` UTC 불변, #232) [artifact: src/components/calendar-sync/sections/DraftSection.tsx::applyBatchTimezone] [why: batch-time-tz]
- [x] T007 [US3] 미리보기 항목 개별 수정 — 항목별 시간/타임존/카테고리 보정값을 클라 상태에 덮어쓰기(다른 항목 불변) [artifact: src/components/calendar-sync/sections/DraftSection.tsx::editItem] [why: per-item-edit]
- [x] T008 [US3] 일괄 확정 API `POST /api/trips/[id]/drafts/promote-batch` 신규 — 선택 draft별 보정값 배열 받아 `promoteDraft` 항목별 호출, 부분 성공 허용, `{promoted, failed}` 반환 [artifact: src/app/api/trips/<id>/drafts/promote-batch/route.ts] [why: batch-promote] [multi-step: 2]
- [x] T009 [US3] DraftSection 확정 핸들러 — 선택 draft의 보정값을 promote-batch로 전송, 성공분 목록 제거·실패분 알림 [artifact: src/components/calendar-sync/sections/DraftSection.tsx::handleConfirm] [why: batch-promote]
- [x] T010 [US3] 카테고리·예약상태 기본값(셀렉트 첫 값 `SIGHTSEEING`/`NOT_NEEDED`) 자동 적용 [artifact: src/components/calendar-sync/sections/DraftSection.tsx::defaults] [why: default-settings]
- [x] T011 [P] [US3] promote-batch 라우트 단위 테스트 — 선택분 승격·부분 성공·미선택 미저장 [artifact: tests/api/drafts-promote-batch.test.ts] [why: batch-promote]

---

## Phase 6: User Story 4 — 좁은 화면 가로 스크롤 방지 (P2)

**Goal**: ≤375px에서 draft 항목이 가로로 넘치지 않게 줄바꿈.

**Independent Test**: 375px 폭에서 가로 스크롤 0, 긴 제목 줄바꿈.

- [x] T012 [US4] draft 항목을 `flex-wrap`/2줄 구성으로 — 체크박스·시각·제목·수정이 ≤375px 폭에서 줄바꿈. 제목 `break-words`, 컨테이너 `min-w-0` [artifact: src/components/calendar-sync/sections/DraftSection.tsx::responsiveItem] [why: mobile-no-hscroll]
- [x] T013 [P] [US4] 좁은 화면 항목 레이아웃 테스트(가로 overflow 방지 클래스 정합) [artifact: tests/components/calendar-sync/DraftSection.test.tsx] [why: mobile-no-hscroll]

---

## Phase 7: Release Bookkeeping

- [ ] T014 `changes/626.feat.md` 단편 추가 — What 한 문장 + 이유 한 문장, 합쇼체. HOW 금지. **release build 시 towncrier 가 소비하므로 미체크 유지** [artifact: changes/626.feat.md] [why: release-bookkeeping]
- [x] T015 `quickstart.md` 작성 — Evidence(자동 `npx vitest run` + 수동 시각 검증) 명시 [artifact: specs/033-calendar-sync-selection/quickstart.md] [why: release-bookkeeping]
- [x] T016 [P] CalendarSyncDialog/DraftSection 회귀 정합 테스트 [artifact: tests/components/calendar-sync/DraftSection.test.tsx] [why: release-bookkeeping]

---

## 의존성 / 순서

- T001 → T002 → T003: 체크박스 → 전체토글 → 테스트.
- T004는 T001 이후(헤더·목록 분리).
- T005 ↔ T006 ↔ T007: 동일 컴포넌트 보정 로직 — 함께 작업.
- T008 → T009: API 신규 → 확정 핸들러 연결.
- T010은 T009와 함께(확정 body 기본값).
- T011은 T008 이후.
- T012 → T013: 반응형 레이아웃 → 테스트.
- T014(미체크 유지)/T015/T016은 최종 커밋 직전.

## Checkpoint

- Phase 3~4 = 선택 + 상단 고정. 1차 검증.
- Phase 5 = 보정·개별 수정·일괄 확정. 2차 검증(MVP 완성).
- Phase 6 = 좁은 화면 정합. 3차 검증.
- Phase 7 = 단편 + Evidence + 회귀.
