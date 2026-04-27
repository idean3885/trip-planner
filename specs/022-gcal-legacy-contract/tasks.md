---
description: "022 레거시 매핑 expand — 태스크"
---

# Tasks: 레거시 per-user 캘린더 모델 contract 정리 (expand 매핑)

**Input**: Design documents from `/specs/022-gcal-legacy-contract/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/legacy-api-gone.md](./contracts/legacy-api-gone.md), [quickstart.md](./quickstart.md)

**Tests**: 포함 (신규 매핑 CRUD + 410 응답).

**Organization**: user story 단위 묶음.

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

---

## Phase 1: Setup

- (해당 없음) 기존 환경.

---

## Phase 2: Foundational

**Purpose**: Prisma 스키마·마이그레이션이 모든 user story의 기반.

- [X] T001 `prisma/schema.prisma`에 `TripCalendarEventMapping` 모델 추가. 필드: `id`, `tripCalendarLinkId` (FK TripCalendarLink, Cascade), `activityId` (FK Activity, Cascade), `googleEventId`, `syncedEtag`, `lastSyncedAt`, `createdAt`, `updatedAt`. `@@unique([tripCalendarLinkId, activityId])` + `@@index([tripCalendarLinkId])` + `@@map("trip_calendar_event_mappings")`. `TripCalendarLink`에 `eventMappings TripCalendarEventMapping[]` 역참조 추가. Activity에도 대응 역참조 [artifact: prisma/schema.prisma] [why: new-mapping-schema]
- [X] T002 Prisma 마이그레이션 SQL 파일 `prisma/migrations/20260423000000_expand_trip_calendar_event_mapping/migration.sql` 생성. 상단에 `[migration-type: data-migration]` 헤더. 내용: (a) `CREATE TABLE trip_calendar_event_mappings ...`, (b) `INSERT INTO trip_calendar_event_mappings (...) SELECT ... FROM gcal_event_mappings gem INNER JOIN gcal_links gl ON gem.link_id = gl.id INNER JOIN trip_calendar_links tcl ON tcl.calendar_id = gl.calendar_id AND tcl.trip_id = gl.trip_id` [artifact: prisma/migrations/20260423000000_expand_trip_calendar_event_mapping/migration.sql] [why: new-mapping-schema] [migration-type: data-migration]
- [X] T003 마이그레이션 무손실 검증 쿼리를 SQL 주석으로 남기거나 별도 `README.md` 파일에 기록. 예: `SELECT (SELECT COUNT(*) FROM gcal_event_mappings) = (SELECT COUNT(*) FROM trip_calendar_event_mappings)` [artifact: prisma/migrations/20260423000000_expand_trip_calendar_event_mapping/migration.sql] [why: mapping-backfill]
- [X] T004 `npx prisma generate`로 Prisma Client 재생성해 `prisma.tripCalendarEventMapping`이 사용 가능함을 확인 + 로컬에서 `pnpm exec tsc --noEmit` 통과 [artifact: prisma/schema.prisma] [why: mapping-backfill]

---

## Phase 3: User Story 1 — 기존 공유 캘린더 사용자가 동작 변화 없음 (Priority: P1) 🎯 MVP

**Goal**: 공유 캘린더 연결·해제·sync·구독이 신규 매핑 기반으로 동일 동작.

**Independent Test**: dev 배포 후 기존 여행으로 "다시 반영하기" → 기존 이벤트 업데이트 정상 + 신규 `trip_calendar_event_mappings`에만 쓰기 발생.

### Implementation for User Story 1

- [X] T005 [US1] `src/lib/gcal/sync.ts`에서 `prisma.gCalEventMapping.*` 참조를 `prisma.tripCalendarEventMapping.*`로 교체. 함수 인자 `linkId` → `tripCalendarLinkId`로 리네이밍. 기존 동작 보존(검색·추가·업데이트·삭제 흐름 동일) [artifact: src/lib/gcal/sync.ts] [why: sync-rewrite]
- [X] T006 [US1] `src/app/api/v2/trips/<id>/calendar/sync/route.ts`의 bridge `GCalLink` 생성·재사용 로직(약 115-175번 줄) 제거. `syncActivities` 호출 시 `tripCalendarLink.id`를 직접 전달. sync 후 `TripCalendarLink` 업데이트만 남김(기존 `GCalLink.update` 제거) [artifact: src/app/api/v2/trips/<id>/calendar/sync/route.ts] [why: sync-rewrite]

**Checkpoint**: US1 완료 — 신규 매핑 기반 sync가 기존 동작 재현.

---

## Phase 4: User Story 2 — 레거시 API 410 Gone (Priority: P2)

**Goal**: 레거시 3개 라우트 호출 시 410 반환.

**Independent Test**: curl로 각 레거시 라우트에 요청 → 410 + 합의된 본문.

### Implementation for User Story 2

- [X] T007 [US2] [P] `src/app/api/trips/<id>/gcal/link/route.ts`를 파일 전체 교체 — 인증·검증 없이 모든 HTTP 메소드(GET/POST/PATCH/DELETE)에 대해 `NextResponse.json({ error: "gone", message: "..." }, { status: 410 })` 반환 [artifact: src/app/api/trips/<id>/gcal/link/route.ts] [why: legacy-api-gone]
- [X] T008 [US2] [P] `src/app/api/trips/<id>/gcal/sync/route.ts`를 동일한 410 핸들러로 교체 [artifact: src/app/api/trips/<id>/gcal/sync/route.ts] [why: legacy-api-gone]
- [X] T009 [US2] [P] `src/app/api/trips/<id>/gcal/status/route.ts`를 동일한 410 핸들러로 교체 [artifact: src/app/api/trips/<id>/gcal/status/route.ts] [why: legacy-api-gone]

**Checkpoint**: US2 완료 — 레거시 진입점 차단.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T010 [P] 신규 sync 동작 회귀 테스트 `tests/api/v2-gcal-sync.test.ts` — Prisma mock으로 `tripCalendarEventMapping`만 호출되고 `gCalEventMapping`은 호출되지 않음 검증(최소 2 케이스) [artifact: tests/api/v2-gcal-sync.test.ts] [why: test-coverage]
- [X] T011 [P] 레거시 라우트 410 회귀 테스트 `tests/api/gcal-legacy-gone.test.ts` — 3개 라우트 각 메소드가 410 + 합의된 본문 반환 검증 [artifact: tests/api/gcal-legacy-gone.test.ts] [why: test-coverage]
- [X] T012 [P] changes 단편 `changes/402.feat.md` What/Why 2줄로 작성 [artifact: CHANGELOG.md] [why: release-note]
- [ ] T013 quickstart.md Evidence 체크박스를 dev 재현 결과로 갱신(배포 후) [artifact: specs/022-gcal-legacy-contract/quickstart.md] [why: test-coverage]
- [X] T014 릴리즈 노트에 "후속 v2.11.0+에서 레거시 테이블·파일 drop 예정" 문구 포함 계획을 changes 단편에 반영 또는 별도 문서 메모 [artifact: CHANGELOG.md] [why: release-note]

---

## Dependencies & Execution Order

- Phase 2 Foundational (T001~T004): 스키마·마이그레이션·Client 생성. 모든 후속 태스크 차단.
- Phase 3 US1 (T005 → T006): `sync.ts`가 새 모델을 쓰도록 교체 후 sync route가 bridge 없이 그 함수를 호출.
- Phase 4 US2 (T007·T008·T009): 서로 다른 파일이라 [P] 병렬.
- Phase 5 Polish: T010·T011·T012 병렬, T013·T014는 이후.

## Parallel Example

```bash
# Phase 4 병렬:
Task: "410 handler for link route"      # T007
Task: "410 handler for sync route"      # T008
Task: "410 handler for status route"    # T009

# Phase 5 병렬:
Task: "v2 sync test"                    # T010
Task: "legacy gone test"                # T011
Task: "changes fragment"                # T012
```

## Implementation Strategy

### MVP First (Foundational + US1)

1. T001~T004로 스키마·마이그레이션·Client 정비.
2. T005·T006으로 코드 전환.
3. 로컬 `pnpm test` + `pnpm exec tsc --noEmit` 통과 확인.
4. dev 배포 → 기존 여행 sync 재현.

### Incremental Delivery

1. MVP → dev 배포 → 주인 sync 확인.
2. + US2(T007~T009) → 레거시 라우트 410 확인.
3. + Polish → develop PR 머지.

## Coverage Target Validation

| Plan `[why]` | Multi-step | Tasks | 충족 |
|---|:-:|---|:-:|
| `new-mapping-schema` | 2 | T001, T002 | ✓ |
| `mapping-backfill` | 2 | T003, T004 | ✓ |
| `sync-rewrite` | 2 | T005, T006 | ✓ |
| `legacy-api-gone` | 2 | T007, T008, T009 | ✓ |
| `test-coverage` | 2 | T010, T011, T013 | ✓ |
| `release-note` | 1 | T012, T014 | ✓ |

---

## Notes

- MVP = Phase 2 + Phase 3.
- 무중단 배포 조건: 구 테이블은 남기고, 코드가 신규 테이블만 쓴다.
- v2.11.0+ 후속 contract 피처에서 구 테이블·파일 drop.
