---
description: "Task list — 예약 완료 상태 추가 + 동기화 타임존 옵션 보강"
---

# Tasks: 예약 완료 상태 추가 + 동기화 타임존 옵션 보강

**Input**: Design documents from `/specs/035-reservation-status-reserved/`
**Prerequisites**: plan.md, spec.md

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

단일 Next.js 웹앱 + MCP 문서. 마이그레이션 1건(schema-only, 비파괴). 신규 의존성 0. 변경분 Vitest 동반.

---

## Phase 3: User Story 1 — 예약 완료 상태 지정·표시 (P1) 🎯 MVP

**Goal**: enum에 RESERVED 추가, 일정 폼·카드·초안에서 "예약 완료" 선택·표시.

**Independent Test**: 일정 폼에서 "예약 완료" 선택·저장 → 카드에 "예약 완료" 표시.

- [x] T001 [US1] `ReservationStatus`에 `RESERVED` 추가 [artifact: prisma/schema.prisma] [why: reserved-enum] [multi-step: 2]
- [x] T002 [US1] 마이그레이션 — `ALTER TYPE "ReservationStatus" ADD VALUE 'RESERVED'`, 헤더 `[migration-type: schema-only]` [artifact: prisma/migrations/20260530000000_add_reserved_status/migration.sql] [why: reserved-enum] [migration-type: schema-only]
- [x] T003 [US1] 일정 폼·카드 라벨 — `ActivityForm` 옵션 배열, `ActivityCard` 라벨 Record 에 RESERVED="예약 완료" [artifact: src/components/ActivityCard.tsx] [why: reserved-surfaces] [multi-step: 3]
- [x] T004 [US1] 초안 승격 폼 라벨 — `DraftSection` 예약 상태 옵션에 RESERVED [artifact: src/components/calendar-sync/sections/DraftSection.tsx::RESERVATION_OPTIONS] [why: reserved-surfaces]

---

## Phase 4: User Story 2 — API·MCP·캘린더 정합 (P1)

**Goal**: RESERVED를 API 검증·OpenAPI·MCP·외부 캘린더 변환에 누락 없이 반영.

**Independent Test**: API로 RESERVED 저장 성공 + OpenAPI/MCP 문서에 RESERVED + 캘린더 변환에 "예약 완료".

- [x] T005 [US2] API 검증 배열 — `promote`·`promote-batch`의 `RESERVATION_STATUSES`에 RESERVED [artifact: src/app/api/trips/<id>/drafts/promote-batch/route.ts] [why: reserved-surfaces]
- [x] T006 [US2] OpenAPI enum — `openapi.ts` reservationStatus enum 3곳에 RESERVED [artifact: src/lib/openapi.ts] [why: reserved-surfaces]
- [x] T007 [US2] MCP 도구 문서 — `planner.py` 예약 상태 설명 2곳에 RESERVED [artifact: mcp/trip_mcp/planner.py] [why: reserved-surfaces]
- [x] T008 [US2] 캘린더 변환 라벨 — `ics.ts`·`gcal/format.ts` RESERVATION_LABEL 에 RESERVED="예약 완료" [artifact: src/lib/gcal/format.ts] [why: reserved-surfaces]

---

## Phase 5: User Story 3 — 타임존 공통 정본 + 보강 (P1)

**Goal**: 타임존 목록을 공통 모듈로 모으고 스페인·포르투갈 등 보강.

**Independent Test**: 타임존 목록에 Europe/Madrid·Europe/Lisbon, DraftSection이 공통 정본 참조.

- [x] T009 [US3] 타임존 정본 모듈 `src/lib/timezones.ts` 신규 — `TIMEZONE_OPTIONS` 정본 + Europe/Madrid·Europe/Lisbon 등 여행지 타임존 보강 [artifact: src/lib/timezones.ts] [why: timezone-common] [multi-step: 2]
- [x] T010 [US3] `DraftSection`이 로컬 하드코딩 대신 정본 모듈 참조 [artifact: src/components/calendar-sync/sections/DraftSection.tsx::TIMEZONE_OPTIONS] [why: timezone-common]

---

## Phase 6: Tests

- [x] T011 [P] RESERVED 표면 정합 테스트 — promote-batch 가 RESERVED 허용, 라벨/OpenAPI enum 포함 [artifact: tests/api/drafts-promote-batch.test.ts] [why: release-bookkeeping]
- [x] T012 [P] 타임존 정본 테스트 — Europe/Madrid·Europe/Lisbon 포함, DraftSection 참조 [artifact: tests/lib/timezones.test.ts] [why: release-bookkeeping]

---

## Phase 7: Release Bookkeeping

- [ ] T013 단편 `changes/632.feat.md`(예약 완료)·`changes/633.feat.md`(타임존 보강) — What + 이유, 합쇼체. release build 시 소비되므로 미체크 유지 [artifact: changes/632.feat.md, changes/633.feat.md] [why: release-bookkeeping]
- [x] T014 `quickstart.md` 작성 — Evidence(자동 vitest + 수동 시각) [artifact: specs/035-reservation-status-reserved/quickstart.md] [why: release-bookkeeping]
- [x] T015 [P] 회귀 — 기존 4값 + ActivityForm 테스트 정합 [artifact: tests/components/ActivityForm.test.tsx] [why: release-bookkeeping]

---

## 의존성 / 순서

- T001 → T002: enum → 마이그레이션.
- T003·T004: 라벨(enum 추가 후 타입 정합).
- T005~T008: 표면 정합 — 병렬 가능(서로 다른 파일).
- T009 → T010: 정본 모듈 → 참조 교체.
- T011·T012·T015: 구현 후.
- T013(미체크 유지)/T014는 최종.

## Checkpoint

- Phase 3 = enum + UI(MVP).
- Phase 4 = 표면 정합.
- Phase 5 = 타임존 정본.
- Phase 6~7 = 테스트 + 단편 + Evidence.
