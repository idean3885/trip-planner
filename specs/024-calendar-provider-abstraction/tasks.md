---

description: "Task list for #416 calendar-provider-abstraction (024)"
---

# Tasks: 캘린더 provider 추상화

**Input**: [spec.md](./spec.md), [plan.md](./plan.md)
**Issue**: [#416](https://github.com/idean3885/trip-planner/issues/416)

**Tests**: 본 피처는 회귀 0 검증이 핵심이라 테스트 필수.

## Format

`[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

## Phase 1: Setup

**Purpose**: 신규 디렉토리 + 인터페이스 빈 구조

- [ ] T001 신규 디렉토리 생성 — `src/lib/calendar/provider/`, `src/lib/calendar/`, `tests/unit/calendar/`, `tests/integration/calendar/`. 빈 `index.ts` 또는 `.gitkeep` 배치 [artifact: src/lib/calendar/provider] [why: provider-interface]

---

## Phase 2: Foundational (Blocking)

**Purpose**: DB expand + 인터페이스 정의. 모든 후속 단계의 전제.

- [ ] T002 DB 마이그레이션 — `trip_calendar_links.provider`, `gcal_links.provider` 컬럼 추가 (NOT NULL DEFAULT 'GOOGLE'). Prisma schema에 enum 또는 String 컬럼 추가 후 `prisma migrate dev` [artifact: prisma/migrations/20260427000000_add_calendar_provider/migration.sql] [why: db-expand] [migration-type: schema-only]
- [ ] T003 Prisma schema 갱신 — `TripCalendarLink`/`GCalLink` 모델에 `provider` 필드 추가 [artifact: prisma/schema.prisma::TripCalendarLink|prisma/schema.prisma::GCalLink] [why: db-expand]
- [ ] T004 [P] CalendarProvider 인터페이스 정의 — `ProviderId`, `ProviderCapabilities`, `CalendarRef`, `ExternalEventRef`, `CalendarErrorCode`, `CalendarProvider` 시그니처. plan.md "Architecture" 섹션 그대로 [artifact: src/lib/calendar/provider/types.ts] [why: provider-interface]
- [ ] T005 [P] Provider registry — `getProvider(id: ProviderId): CalendarProvider`. Apple은 throw "not implemented (#417)" [artifact: src/lib/calendar/provider/registry.ts] [why: provider-interface]

**Checkpoint**: 인터페이스 + DB 컬럼 준비 완료. US1 진행 가능.

---

## Phase 3: User Story 1 — 기존 구글 사용자 회귀 0 (Priority: P1) 🎯 MVP

**Goal**: 기존 v2.9.0~v2.10.0 흐름이 인터페이스 위임 후에도 동일 응답·UI.

**Independent Test**: v2 라우트 4종(POST/DELETE/GET `/api/v2/trips/<id>/calendar`, `/sync`, `/subscribe`)을 폐기·재발급한 토큰 등 변수로 호출, 응답 스키마·동작이 머지 직전과 동일.

### Tests for US1

- [ ] T006 [P] [US1] v2 라우트 응답 스키마 회귀 테스트 — POST/DELETE/GET `/api/v2/trips/<id>/calendar`, `/sync`, `/subscribe` 6개 응답이 머지 직전 스냅샷과 byte-equivalent 또는 schema-equivalent [artifact: tests/integration/calendar/v2-routes-regression.test.ts] [why: v1-compat]
- [ ] T007 [P] [US1] CalendarService 단위 테스트 — link row의 provider를 읽어 `getProvider`로 위임하는 분기 검증 [artifact: tests/unit/calendar/service.test.ts] [why: route-delegation]

### Implementation for US1

- [ ] T008 [US1] Google 구현체 — 기존 `src/lib/gcal/{client,format,auth,acl,errors,unregistered}.ts`의 함수를 `src/lib/calendar/provider/google.ts`의 `googleProvider: CalendarProvider` 객체에 래핑. 기존 함수 본체는 거의 그대로 호출, 시그니처만 인터페이스에 맞춰 조정 [artifact: src/lib/calendar/provider/google.ts] [why: provider-interface]
- [ ] T009 [US1] CalendarService — 라우트 ↔ provider 사이 layer. 권한 검증 후 link row 로드, `getProvider(link.provider)` 호출, 응답 normalize → 기존 v2 응답 스키마 그대로 [artifact: src/lib/calendar/service.ts] [why: route-delegation]
- [ ] T010 [US1] v2 POST/DELETE/GET `/api/v2/trips/<id>/calendar` 라우트 위임 교체 [artifact: src/app/api/v2/trips/<id>/calendar/route.ts] [why: route-delegation]
- [ ] T011 [US1] v2 POST `/api/v2/trips/<id>/calendar/sync` 라우트 위임 교체 [artifact: src/app/api/v2/trips/<id>/calendar/sync/route.ts] [why: route-delegation]
- [ ] T012 [US1] v2 POST/DELETE `/api/v2/trips/<id>/calendar/subscribe` 라우트 위임 교체 [artifact: src/app/api/v2/trips/<id>/calendar/subscribe/route.ts] [why: route-delegation]

**Checkpoint**: 라우트 4종이 인터페이스 위임으로 동작 + 회귀 테스트 통과. US1 완료.

---

## Phase 4: User Story 2 — 일관 에러 톤 (Priority: P2)

**Goal**: 6종 vocabulary로 정규화된 에러가 사용자 가시 메시지에 반영.

**Independent Test**: 의도적 401(폐기 토큰), 412(외부 직접 수정), 403 unregistered 시 응답 body의 에러 코드가 vocabulary 6종 중 하나.

### Tests for US2

- [ ] T013 [P] [US2] 에러 분류 매핑 단위 테스트 — Google API 응답(401, 412, 403 unregistered, 5xx)을 `classifyError`가 vocabulary로 매핑하는 분기 [artifact: tests/unit/calendar/google-classify-error.test.ts] [why: error-vocab]

### Implementation for US2

- [ ] T014 [US2] `googleProvider.classifyError` 구현 — 기존 `src/lib/gcal/errors.ts`의 분류 로직을 인터페이스 메서드로 노출. 6종 중 하나 또는 null 반환 [artifact: src/lib/calendar/provider/google.ts::classifyError] [why: error-vocab]
- [ ] T015 [US2] 라우트가 에러 응답 시 `classifyError` 결과 코드를 응답 body의 `error.code`(또는 기존 키)에 포함. 기존 v2 응답 스키마는 유지하되 신규 분류 정보를 함께 노출. UI 컴포넌트(`GCalLinkPanel`)는 본 회차에서 변경하지 않음(기존 분기 그대로) [artifact: src/lib/calendar/service.ts::normalizeError] [why: error-vocab]

**Checkpoint**: 에러 vocabulary 6종이 라우트 응답에 반영, UI 변경 없음. US2 완료.

---

## Phase 5: User Story 3 — 미래 확장성 토대 (Priority: P3)

**Goal**: capability 노출 + ACL retain 판정 + 직접 호출 분기 0 (contract 후속 분리).

**Independent Test**: provider capability를 라우트가 읽어 분기하는지 코드 검증 + retain 판정이 의도대로 동작.

### Tests for US3

- [ ] T016 [P] [US3] capability·retain 단위 테스트 — `googleProvider.capabilities`가 `{ autoMemberAcl: "auto", supportsCalendarCreation: true, supportsCalendarSelection: true }`. retain 판정은 "다른 link에 같은 calendarId+memberEmail 활성" 조건일 때 `revoked: false` [artifact: tests/unit/calendar/google-acl-retain.test.ts] [why: acl-retain]

### Implementation for US3

- [ ] T017 [US3] `googleProvider.capabilities` 정의 — plan.md 명시값 그대로 [artifact: src/lib/calendar/provider/google.ts::capabilities] [why: capability]
- [ ] T018 [US3] `googleProvider.upsertMemberAcl` 구현 — 기존 `src/lib/gcal/acl.ts::upsertAcl` 래핑 [artifact: src/lib/calendar/provider/google.ts::upsertMemberAcl] [why: acl-retain]
- [ ] T019 [US3] `googleProvider.revokeMemberAcl` 구현 — `retainIfStillNeeded: true`면 `prisma.tripCalendarLink.findFirst({ where: { calendarId, ownerId, NOT: { tripId: currentTripId }, subscriptions: { some: { userId, status: "ADDED" } } } })` 확인 후 보류 결정 [artifact: src/lib/calendar/provider/google.ts::revokeMemberAcl] [why: acl-retain]

**Checkpoint**: capability + retain 판정 동작. US3 완료.

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: 단편·문서·증거·v1 호환 정리.

- [ ] T020 [P] capability 단위 테스트 — 라우트가 provider별 분기를 직접 하지 않고 capability를 읽는지 정적 검증(grep + 단위 테스트로 patterns 검출) [artifact: tests/unit/calendar/capability.test.ts] [why: capability]
- [ ] T021 [P] v1 호환 라우트 회귀 테스트 — `/api/trips/<id>/gcal/status`가 410 Gone 유지(spec 022, #410 fix). v1 응답 스키마 변경 0 검증 [artifact: tests/api/gcal-legacy-gone.test.ts] [why: v1-compat]
- [ ] T022 changes 단편 작성 — What/Why 2줄. 단편 타입은 `chore` (사용자 가시 변경 0이므로 fix/feat 부적합). 이슈 번호는 PR 직전 확정 후 파일명에 반영(`changes/<이슈>.chore.md`) [artifact: CHANGELOG.md] [why: v1-compat]
- [ ] T023 quickstart.md의 Evidence 섹션을 자동 회귀 테스트(T006, T007, T013, T016, T020, T021) + 수동 dev 검증으로 충족 [artifact: specs/024-calendar-provider-abstraction/quickstart.md] [why: v1-compat]

---

## Dependencies

- T001 → 모든 후속
- T002 → T003 (Prisma schema) → T008+ (Google 구현체)
- T004 → T005 → T008 (인터페이스 → registry → 구현체)
- T008 → T009 → T010, T011, T012 (구현체 → service → 라우트)
- T009 → T013, T014, T015 (service → 에러 vocab)
- T008 → T017, T018, T019 (구현체 → capability + ACL)
- T020, T021 → T022, T023 (검증 → 단편/문서)

## Parallel Execution Notes

- T004, T005는 인터페이스만 정의라 병렬 가능
- T010, T011, T012는 다른 라우트 파일이라 병렬 가능
- T013, T016, T020, T021은 독립 테스트 파일이라 병렬 가능

## Coverage Verification

`validate-plan-tasks-cov.sh` 통과 조건:

| [why] | plan multi-step | tasks 매핑 수 | 상태 |
|---|---|---|---|
| provider-interface | 3 | T001, T004, T005, T008 = 4 | ✓ |
| db-expand | 1 | T002, T003 = 2 | ✓ |
| route-delegation | 4 | T007, T009, T010, T011, T012 = 5 | ✓ |
| acl-retain | 2 | T016, T018, T019 = 3 | ✓ |
| error-vocab | 2 | T013, T014, T015 = 3 | ✓ |
| v1-compat | 1 | T006, T021, T022, T023 = 4 | ✓ |
| capability | 1 | T017, T020 = 2 | ✓ |
