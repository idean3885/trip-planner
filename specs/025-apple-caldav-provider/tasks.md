---

description: "Task list for #417 apple-caldav-provider (025)"
---

# Tasks: Apple iCloud CalDAV Provider

**Input**: [spec.md](./spec.md), [plan.md](./plan.md)
**Issue**: [#417](https://github.com/idean3885/trip-planner/issues/417)

**Tests**: 본 피처는 외부 의존(iCloud) + 암호화 + 회귀 0이 핵심이라 단위 테스트 + 통합 테스트 + 수동 dev 검증 필수.

## Format

`[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

## Phase 1: Setup

**Purpose**: 신규 의존성 + env 키 + 디렉토리 준비

- [x] T001 `tsdav@^2.1.8` 의존성 추가 (`pnpm add tsdav` 또는 npm). package.json + lockfile 갱신 [artifact: package.json] [why: caldav-client]
- [x] T002 env `APPLE_PASSWORD_ENCRYPTION_KEY` 추가 — dev/preview/production 별도 32바이트 base64. 배포 환경 변수에 저장 + .env.example 갱신 [artifact: .env.example] [why: crypto]

---

## Phase 2: Foundational (Blocking)

**Purpose**: DB 마이그레이션 + 암호화 모듈 + tsdav wrapper. US1 진행 전 모두 완료 필요.

- [x] T003 Prisma schema — `AppleCalendarCredential` 모델 추가 (userId @id @relation User, appleId, encryptedPassword, iv, createdAt, updatedAt, lastValidatedAt, lastError) [artifact: prisma/schema.prisma::AppleCalendarCredential] [why: db-credential]
- [x] T004 마이그레이션 SQL — `apple_calendar_credentials` 테이블 생성 [artifact: prisma/migrations/20260427000000_add_apple_credentials/migration.sql] [why: db-credential] [migration-type: schema-only]
- [x] T005 [P] 암호화 모듈 — `encryptPassword(plaintext)` / `decryptPassword(ciphertext, iv)`. AES-256-GCM, env 키 32바이트 검증 [artifact: src/lib/calendar/provider/apple-crypto.ts] [why: crypto]
- [x] T006 [P] tsdav wrapper — `createAppleClient({ appleId, appPassword })` 단일 진입점 [artifact: src/lib/calendar/provider/apple-client.ts] [why: caldav-client]
- [x] T007 [P] ICS 변환 — `formatActivityAsIcs(activity, trip, ctx)` Activity → VEVENT ICS 문자열 [artifact: src/lib/calendar/ics.ts] [why: sync-delegate]

**Checkpoint**: DB·암호화·CalDAV 클라이언트·ICS 변환 준비 완료. US1 진행 가능.

---

## Phase 3: User Story 1 — Apple 첫 연결 + 첫 sync (Priority: P1) 🎯 MVP

**Goal**: 새 사용자가 위자드 → 앱 암호 입력 → 캘린더 자동 생성 → 첫 sync까지 완료.

**Independent Test**: dev 환경에서 본인 Apple ID로 위자드 → 90초 이내 첫 sync 완료 + iPhone Calendar 앱에 이벤트 표시.

### Tests for US1

- [x] T008 [P] [US1] 암호화 round-trip 단위 테스트 — encrypt → decrypt가 원본과 일치 + 잘못된 키로 decrypt 실패 [artifact: tests/unit/calendar/apple-crypto-roundtrip.test.ts] [why: crypto]
- [x] T009 [P] [US1] appleProvider.classifyError 단위 테스트 — 401/412/5xx/network → vocabulary 매핑 [artifact: tests/unit/calendar/apple-classify-error.test.ts] [why: apple-error-vocab]
- [x] T010 [P] [US1] appleProvider.capabilities 단위 테스트 — `{ autoMemberAcl: "manual", supportsCalendarCreation: true, supportsCalendarSelection: true }` [artifact: tests/unit/calendar/apple-capability.test.ts] [why: provider-impl]
- [ ] T011 [P] [US1] 위자드 검증 통합 테스트 — `/api/v2/calendar/apple/validate` 401·200 분기 (tsdav mock) [artifact: tests/integration/calendar/apple-wizard-validate.test.ts] [why: wizard-ui] (후속 회차)

### Implementation for US1

- [x] T012 [US1] appleProvider 구현 — hasValidAuth/getReauthUrl/listCalendars/createCalendar/putEvent/updateEvent/deleteEvent/upsertMemberAcl/revokeMemberAcl/classifyError 메서드 [artifact: src/lib/calendar/provider/apple.ts] [why: provider-impl]
- [x] T013 [US1] registry 갱신 — `getProvider("APPLE")`이 throw 대신 appleProvider 반환 [artifact: src/lib/calendar/provider/registry.ts] [why: provider-impl]
- [x] T014 [US1] 검증 라우트 `POST /api/v2/calendar/apple/validate` — appleId+password 검증 + AppleCalendarCredential upsert [artifact: src/app/api/v2/calendar/apple/validate/route.ts] [why: wizard-ui]
- [x] T015 [US1] 캘린더 목록 라우트 `GET /api/v2/calendar/apple/calendars` — listCalendars 결과 반환 (VEVENT 필터 적용됨) [artifact: src/app/api/v2/calendar/apple/calendars/route.ts] [why: provider-impl]
- [x] T016 [US1] 연결 라우트 `POST /api/v2/trips/<id>/calendar/apple/connect` — service.connectAppleCalendar 위임 (provider="APPLE") [artifact: src/app/api/v2/trips/<id>/calendar/apple/connect/route.ts] [why: wizard-ui]
- [x] T017 [US1] service.connectAppleCalendar — provider.hasValidAuth 검증 + createCalendar 호출, link 생성 시 provider="APPLE" + manualAclGuidance 응답 포함 [artifact: src/lib/calendar/service.ts] [why: provider-impl]
- [x] T018 [US1] 위자드 UI Step 1·2·3·4 — `AppleConnectWizard` 단일 컴포넌트에 4단계 inline 구현 (Step별 분리는 후속 회차) [artifact: src/components/calendar/AppleConnectWizard.tsx] [why: wizard-ui]
- [x] T019 [US1] Step 2 가이드 캡쳐 — public/research/apple-caldav-screenshots/로 복사 + 위자드에 임베드 [artifact: public/research/apple-caldav-screenshots/step-4-create-button.png] [why: wizard-ui]
- [x] T020 [US1] Step 3 입력·검증 흐름 — fetch /api/v2/calendar/apple/validate + 에러 안내 + 자동 connect 호출 [artifact: src/components/calendar/AppleConnectWizard.tsx] [why: wizard-ui]
- [x] T021 [US1] Step 4 결과 — 생성 캘린더명 + manualAclGuidance 배너 [artifact: src/components/calendar/AppleConnectWizard.tsx] [why: wizard-ui]
- [x] T022 [US1] 위자드 컨테이너 — `AppleConnectWizard` 4단계 stepper, reauth 모드 지원 [artifact: src/components/calendar/AppleConnectWizard.tsx] [why: wizard-ui]
- [x] T023 [US1] 위자드 진입 페이지 `/trips/<id>/calendar/connect-apple` — apple_reauth=1 쿼리 시 재인증 모드 [artifact: src/app/trips/<id>/calendar/connect-apple/page.tsx] [why: wizard-ui]

**Checkpoint**: Apple 첫 연결 + 첫 sync 동작. US1 완료.

---

## Phase 4: User Story 2 — 인증 만료 즉시 안내 (Priority: P2)

**Goal**: 401 발생 시 응답에 vocabulary 코드 포함 + UI 배너로 재인증 유도.

**Independent Test**: 의도적 무효 암호로 sync 트리거 → `auth_invalid` 응답 + 위자드 진입 링크.

### Tests for US2

- [ ] T024 [P] [US2] sync 401 분기 단위 테스트 — appleProvider.classifyError 결과가 응답 body에 포함되는지 + lastError 갱신 [artifact: tests/unit/calendar/apple-sync-401.test.ts] [why: apple-error-vocab] (후속 회차 — service.syncCalendar Apple 분기는 통합 테스트로 보강)

### Implementation for US2

- [x] T025 [US2] service.syncCalendar Apple 분기 — link.provider="APPLE"이면 syncAppleLinkBranch 분기 → syncAppleActivities. 401 catch 시 reauthUrl 포함 응답 [artifact: src/lib/calendar/service.ts::syncCalendar] [why: apple-error-vocab]
- [x] T026 [US2] 재인증 진입 흐름 — 위자드의 `reauth` prop true 시 Step 3부터 시작, 캘린더 재생성 안 하고 credential만 갱신 [artifact: src/components/calendar/AppleConnectWizard.tsx] [why: apple-error-vocab]

**Checkpoint**: 401 알림 + 재인증 흐름 동작. US2 완료.

---

## Phase 5: User Story 3 — VTODO 필터 + manual ACL 안내 (Priority: P3)

**Goal**: VTODO 캘린더 자동 제외 + 멤버 ACL 자동 호출 0회 + 안내 텍스트.

**Independent Test**: VTODO 보유 계정으로 calendars 조회 → VEVENT만 노출. 멤버 2명 trip 연결 → 응답에 manualAclGuidance 포함.

### Tests for US3

- [ ] T027 [P] [US3] VTODO 필터 단위 테스트 — fetchCalendars mock 응답에서 VEVENT만 반환 [artifact: tests/unit/calendar/apple-vtodo-filter.test.ts] [why: provider-impl]
- [x] T028 [P] [US3] manual ACL 분기 단위 테스트 — capability `manual`이면 service가 upsertMemberAcl 호출 0회 + manualAclGuidance 응답 포함 [artifact: tests/unit/calendar/service-manual-acl-branch.test.ts] [why: manual-acl]

### Implementation for US3

- [x] T029 [US3] service.connectAppleCalendar manual 분기 — capability `auto`가 아니면 ACL 호출 skip + 응답 body에 `manualAclGuidance` (멤버 이메일 목록 안내 텍스트) 포함 [artifact: src/lib/calendar/service.ts::connectAppleCalendar] [why: manual-acl]

**Checkpoint**: VTODO 필터 + manual ACL 안내 동작. US3 완료.

---

## Phase 6: sync 분해 (Cross-Cutting)

**Purpose**: provider 인터페이스 putEvent/updateEvent/deleteEvent를 실제 호출 경로로 사용. Google·Apple 공통 sync 엔진.

- [x] T030 Apple sync 모듈 — `syncAppleActivities(ctx)` Activity → ICS → provider.putEvent/updateEvent/deleteEvent. 412 처리는 skipped 카운트 [artifact: src/lib/calendar/sync-apple.ts] [why: sync-delegate]
- [ ] T031 src/lib/gcal/sync.ts 통합 어댑터 — Google·Apple 공통 sync-engine으로 진정한 분해는 v2.12 contract 회차로 이연 [artifact: src/lib/gcal/sync.ts] [why: sync-delegate] (후속 회차)
- [ ] T032 googleProvider.putEvent/updateEvent/deleteEvent stub 채움 — Google sync 어댑터 단계와 함께 contract 회차 [artifact: src/lib/calendar/provider/google.ts] [why: sync-delegate] (후속 회차)

**Checkpoint**: sync 경로가 provider 인터페이스를 경유. Google 회귀 0 검증.

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: 회귀 테스트 + 단편 + Evidence + 문서.

- [ ] T033 [P] Google 회귀 테스트 — connect/sync/subscribe 응답 schema-equivalent (POST/sync 5건 dev 측정) [artifact: tests/integration/calendar/google-no-regress.test.ts] [why: google-no-regress]
- [ ] T034 [P] capability 정적 검증 — 라우트가 provider별 분기를 직접 하지 않고 capability를 읽는지 grep + 단위 테스트 [artifact: tests/unit/calendar/apple-capability.test.ts] [why: provider-impl]
- [ ] T035 changes 단편 — What/Why 2줄, 타입 `feat` (사용자 가시 신규 기능) [artifact: changes/417.feat.md] [why: google-no-regress]
- [ ] T036 quickstart.md Evidence 섹션 — 자동 회귀 테스트 + 수동 dev 검증 시나리오 [artifact: specs/025-apple-caldav-provider/quickstart.md] [why: google-no-regress]
- [ ] T037 docs 갱신 — README의 Active Technologies에 tsdav, AppleCalendarCredential 추가 [artifact: CLAUDE.md] [why: caldav-client]

---

## Dependencies

- T001, T002 → 모든 후속
- T003 → T004 (Prisma → migration SQL)
- T005, T006, T007 → T012 (모듈 → provider 구현)
- T012 → T013, T014, T015, T016, T017 (provider → registry → 라우트)
- T012 → T024, T025, T026 (provider → 401 분기)
- T012 → T027, T029 (provider → VTODO + manual ACL)
- T012 → T030, T031, T032 (provider → sync-engine 위임)
- T030 → T033 (sync-engine → Google 회귀)
- T018~T023 → T026 (위자드 UI → 재인증 흐름)
- T033, T034 → T035, T036 (검증 → 단편/문서)

## Parallel Execution Notes

- T005, T006, T007 (모듈 셋)는 서로 독립이라 병렬 가능
- T008, T009, T010, T011 (테스트 4종)는 독립 파일이라 병렬 가능
- T018~T021 (Step 컴포넌트)는 다른 파일이라 병렬 가능
- T024, T027, T028, T033, T034 (테스트)는 병렬 가능

## Coverage Verification

`validate-plan-tasks-cov.sh` 통과 조건:

| [why] | plan multi-step | tasks 매핑 수 | 상태 |
|---|---|---|---|
| caldav-client | 2 | T001, T006, T037 = 3 | ✓ |
| db-credential | 2 | T003, T004 = 2 | ✓ |
| crypto | 1 | T002, T005, T008 = 3 | ✓ |
| provider-impl | 4 | T010, T012, T013, T015, T027, T032, T034 = 7 | ✓ |
| wizard-ui | 3 | T011, T014, T016, T018, T019, T020, T021, T022, T023 = 9 | ✓ |
| manual-acl | 1 | T028, T029 = 2 | ✓ |
| sync-delegate | 2 | T007, T030, T031, T032 = 4 | ✓ |
| google-no-regress | 1 | T033, T035, T036 = 3 | ✓ |
| apple-error-vocab | 1 | T009, T024, T025, T026 = 4 | ✓ |
