---

description: "Google Calendar 연동 구현 태스크 — plan.md Coverage Targets 11개 매핑"
---

# Tasks: Google Calendar 연동 (웹 접근자를 위한 1순위 캘린더 연결)

**Input**: Design documents from `/specs/018-gcal-integration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/gcal-api.yaml, quickstart.md

**Tests**: 포함. quickstart.md의 `### Evidence`에 Vitest 항목이 명시되어 있으므로 구현과 함께 생성한다.

**Organization**: User Story 단위로 그룹화하여 각 Story가 독립적으로 구현·검증 가능하게 한다.

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

- `[P]`: 다른 파일 · 의존성 없음 → 병렬 가능
- `[Story]`: US1 / US2 / US3
- `[artifact: <path>|<path>::<symbol>]`: drift 감사 대상
- `[why: <tag>]`: plan.md Coverage Target과 일치

## Path Conventions

Next.js App Router 단일 레포. 기존 관례 유지.
- API 라우트: `src/app/api/trips/<id>/gcal/**`
- 라이브러리: `src/lib/gcal/**`
- 컴포넌트: `src/components/GCal*`
- 테스트: `tests/api/gcal-*`, `tests/lib/gcal/*`, `tests/components/GCal*`
- 스키마/마이그레이션: `prisma/schema.prisma`, `prisma/migrations/<ts>_add_gcal_integration/migration.sql`

---

## Phase 1: Setup

- [ ] T001 `@googleapis/calendar@^14` + `google-auth-library@^10` 의존성 추가 (ADR-0002 참조) [artifact: package.json] [why: gcal-auth]
- [ ] T002 [P] 공통 타입 정의(GCalEvent, GCalLinkState, SyncSummary, SyncResponse, ConsentRequired) [artifact: src/types/gcal.ts] [why: gcal-data]

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ Phase 2 완료 전까지 User Story 작업을 시작할 수 없음**

- [ ] T003 Prisma 스키마에 GCalLink, GCalEventMapping 모델 추가 (User/Trip/Activity 관계, Unique, onDelete: Cascade) [artifact: prisma/schema.prisma] [why: gcal-data]
- [ ] T004 마이그레이션 생성(CREATE TABLE 2건 + 인덱스). migration.sql 상단에 `-- [migration-type: schema-only]` 헤더 [artifact: prisma/migrations/<ts>_add_gcal_integration/migration.sql] [why: gcal-data] [migration-type: schema-only]
- [ ] T005 [P] Google OAuth 증분 동의 URL 빌더(include_granted_scopes=true, prompt=consent, calendar.events scope) [artifact: src/lib/gcal/auth.ts] [why: gcal-auth]
- [ ] T006 scope 증분 동의 콜백 처리(Account.scope 갱신 훅) [artifact: src/app/api/auth/<...nextauth>/route.ts] [why: gcal-auth]
- [ ] T007 [P] 현재 세션 사용자의 calendar.events scope 보유 여부 체크 헬퍼 [artifact: src/lib/gcal/auth.ts::hasCalendarScope] [why: gcal-auth]
- [ ] T008 [P] Google Calendar SDK 클라이언트 래퍼 + OAuth2Client 바인딩 + GaxiosError → 도메인 오류 매퍼(401/403/404/412/429/5xx) [artifact: src/lib/gcal/client.ts] [why: gcal-error]
- [ ] T009 [P] Activity → Google Event 포맷터(제목 `[여행명] 카테고리기호 활동제목`, 설명란 예약 상태·지도 링크·트립 URL, 시작/종료 timeZone 주입) [artifact: src/lib/gcal/format.ts] [why: gcal-event-format]

**Checkpoint**: Foundation 완료 — User Story 1/2/3 병렬 착수 가능

---

## Phase 3: User Story 1 — 웹 접근자가 자기 여행을 구글 캘린더에 올리기 (Priority: P1) 🎯 MVP

**Goal**: 구글 로그인 사용자가 여행 상세에서 한 번의 버튼 상호작용으로 본인 구글 캘린더에 여행 활동을 이벤트로 생성. 중복 없이 재반영, 연결 해제 시 사용자 수정분 보호.

**Independent Test**: `POST /api/trips/{id}/gcal/link` 실행 → scope 동의 완료 → 본인 구글 캘린더에 이벤트 생성 확인.

### Tests for User Story 1

- [ ] T010 [P] [US1] link 라우트 contract 테스트(scope 없으면 409 + authorizationUrl, 있으면 200 + summary, DELETE시 skipped 집계) [artifact: tests/api/gcal-link.test.ts] [why: gcal-sync]
- [ ] T011 [P] [US1] sync 라우트 contract 테스트(생성/갱신/삭제 diff, 412 → skipped, retryOnly 동작) [artifact: tests/api/gcal-sync.test.ts] [why: gcal-sync]
- [ ] T012 [P] [US1] status 라우트 contract 테스트(연결·미연결 응답, scopeGranted 플래그) [artifact: tests/api/gcal-status.test.ts] [why: gcal-status-ui]
- [ ] T013 [P] [US1] client 유닛 테스트(오류 매핑 6종 + refresh 재시도 동시성) [artifact: tests/lib/gcal/client.test.ts] [why: gcal-error]
- [ ] T014 [P] [US1] sync diff 유닛 테스트(create/update/delete 분류, ETag 기반 skip) [artifact: tests/lib/gcal/sync.test.ts] [why: gcal-sync]
- [ ] T015 [P] [US1] format 유닛 테스트(제목/설명/타임존 반영, #232·#325 기준) [artifact: tests/lib/gcal/format.test.ts] [why: gcal-event-format]
- [ ] T016 [P] [US1] auth URL 빌더·scope 체크 유닛 테스트 [artifact: tests/lib/gcal/auth.test.ts] [why: gcal-auth]
- [ ] T017 [P] [US1] GCalLinkPanel 컴포넌트 테스트(비연결/연결/skipped/REVOKED 4 상태 렌더, 재시도 버튼) [artifact: tests/components/GCalLinkPanel.test.tsx] [why: gcal-ui-entry]
- [ ] T018 [P] [US1] GCalCalendarChoice 컴포넌트 테스트(DEDICATED 기본값, PRIMARY 전환) [artifact: tests/components/GCalCalendarChoice.test.tsx] [why: gcal-calendar-choice]

### Implementation for User Story 1

- [ ] T019 [US1] sync diff 엔진(활동 ↔ 매핑 비교 → create/update/delete 분류, ETag 기반 skip 규칙) [artifact: src/lib/gcal/sync.ts] [why: gcal-sync]
- [ ] T020 [US1] POST /api/trips/{id}/gcal/link — scope 체크(T007) → 없으면 consent_required 응답, 있으면 전용 캘린더 생성·이벤트 일괄 생성·매핑 저장 [artifact: src/app/api/trips/<id>/gcal/link/route.ts] [why: gcal-sync]
- [ ] T021 [US1] 동일 route의 DELETE — 매핑 순회 DELETE(If-Match), 412 → skipped++, 완료 후 GCalLink 제거 [artifact: src/app/api/trips/<id>/gcal/link/route.ts::DELETE] [why: gcal-unlink]
- [ ] T022 [US1] 캘린더 선택 로직 분리(DEDICATED → POST calendars + summary/timeZone 자동, PRIMARY → calendarId="primary") [artifact: src/app/api/trips/<id>/gcal/link/route.ts::resolveCalendar] [why: gcal-calendar-choice]
- [ ] T023 [US1] PATCH /api/trips/{id}/gcal/sync — diff 실행, 부분 실패 응답 스키마(status/summary/failed/link) 반환. retryOnly 입력 지원 [artifact: src/app/api/trips/<id>/gcal/sync/route.ts] [why: gcal-sync]
- [ ] T024 [US1] GET /api/trips/{id}/gcal/status — 본인 GCalLink 조회 + scopeGranted 판정 [artifact: src/app/api/trips/<id>/gcal/status/route.ts] [why: gcal-status-ui]
- [ ] T025 [US1] GCalCalendarChoice 컴포넌트(DEDICATED 기본값 라디오, PRIMARY 전환) [artifact: src/components/GCalCalendarChoice.tsx] [why: gcal-calendar-choice]
- [ ] T026 [US1] GCalLinkPanel 컴포넌트 — 진입점 버튼, 캘린더 선택 모달, 상태 표시, 실패 재시도 [artifact: src/components/GCalLinkPanel.tsx] [why: gcal-ui-entry]
- [ ] T027 [US1] 여행 상세 페이지에 GCalLinkPanel 삽입(스크롤 없이 보이는 위치, #150 해소 검증) [artifact: src/app/trips/<id>/page.tsx] [why: gcal-ui-entry]
- [ ] T028 [US1] 상태 표시 파트 — 연결됨 캘린더명, 마지막 반영 시각, 건너뜀 N개, 실패 F개 배지 [artifact: src/components/GCalLinkPanel.tsx::StatusRow] [why: gcal-status-ui]
- [ ] T029 [US1] 실패·부분 성공 UX — failed[] 렌더, 재시도 버튼(retryOnly payload 호출), REVOKED → 재연결 CTA [artifact: src/components/GCalLinkPanel.tsx::FailurePanel] [why: gcal-error]

**Checkpoint**: US1 독립 동작. 단일 사용자 기준 #305/#150 해소.

---

## Phase 4: User Story 2 — 공유 여행에서 멤버 각자 본인 GCal로만 옵트인 (Priority: P2)

**Goal**: 공유 여행에서 한 멤버의 연동이 타 멤버 캘린더를 건드리지 않는다. 서버 코드 경로 자체가 본인 토큰만 취급.

**Independent Test**: 여행에 A/B 멤버, A 세션으로 link 실행 → B 캘린더 변화 0개. B의 status 조회 → `linked=false`, 타인의 연동 상태는 노출되지 않음.

### Tests for User Story 2

- [ ] T030 [P] [US2] 본인 토큰 경계 강제 검증(A 세션 호출 시 B의 Account가 조회되지 않음) [artifact: tests/api/gcal-sync.test.ts::token-isolation] [why: gcal-per-member]
- [ ] T031 [P] [US2] status 응답에서 타 멤버의 GCalLink가 본인 결과로 노출되지 않음 [artifact: tests/api/gcal-status.test.ts::multi-member] [why: gcal-per-member]

### Implementation for User Story 2

- [ ] T032 [US2] `getUserOAuth(session.user.id)` 헬퍼 도입 — Prisma `account.findFirst` 의 where 절을 세션 userId로 고정. 다른 userId 매개변수는 받지 않음 [artifact: src/lib/gcal/client.ts::getUserOAuth] [why: gcal-per-member]
- [ ] T033 [US2] status 라우트에서 `findFirst({ where: { userId: session.user.id, tripId } })` 로 본인 링크만 조회 [artifact: src/app/api/trips/<id>/gcal/status/route.ts::selfOnly] [why: gcal-per-member]

**Checkpoint**: 공유 여행에서 FR-007(본인 GCal 한정) 구조적 보장.

---

## Phase 5: User Story 3 — iCal 경로(레포/CLI 접근자) 무회귀 유지 (Priority: P3)

**Goal**: 기존 `che-ical-mcp` 기반 iCal 경로가 동일하게 동작. GCal 도입이 iCal 경로를 제거·변경하지 않음.

**Independent Test**: 배포 전·후 각각 기존 iCal 시나리오 수행 → iCloud '여행' 캘린더에 이벤트가 이전과 동일 생성.

### Implementation for User Story 3

- [ ] T034 [P] [US3] iCal 경로 회귀 검증 시나리오 문서화(단계별 체크, 비교 관찰점) [artifact: docs/evidence/018-gcal-integration/ical-regression.md] [why: gcal-ical-regression]
- [ ] T035 [P] [US3] 기존 iCal 연동 시나리오 E2E 재검증(quickstart.md 회귀 섹션에 체크 반영) [artifact: specs/018-gcal-integration/quickstart.md::ical-regression] [why: gcal-ical-regression]

**Checkpoint**: iCal 경로(FR-011) 무회귀 보증.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T036 [P] changes/305.feat.md 단편 추가(towncrier 게이트) [artifact: changes/305.feat.md] [why: gcal-ui-entry]
- [ ] T037 [P] README/안내에 GCal 연동 진입점 섹션 추가(웹 접근자 대상 노출) [artifact: README.md::gcal] [why: gcal-ui-entry]
- [ ] T038 quickstart.md Evidence 수동 수행(실제 구글 계정 end-to-end, 공유 여행 2계정 포함) [artifact: specs/018-gcal-integration/quickstart.md] [why: gcal-ui-entry]

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (P1)**: T001, T002 — 즉시 시작
- **Foundational (P2)**: T003~T009 — Setup 완료 후. Setup·Foundational 완료 전까지 US 작업 금지
- **US1 (P3)**: T010~T029 — Foundational 완료 후 착수. 이 피처의 MVP
- **US2 (P4)**: T030~T033 — Foundational 완료 후 착수 가능. 1인 순차면 US1 이후
- **US3 (P5)**: T034~T035 — 다른 Story와 독립. Foundational 이전에도 문서 작성 가능
- **Polish (P6)**: T036~T038 — 모든 Story 완료 후

### Within User Story 1

- 테스트 T010~T018 우선 작성(실패 확인) → 구현 T019~T029
- T019(sync) → T020/T023(route)
- T025(Choice) + T026(Panel) → T027(page 삽입) → T028/T029(상태·실패)

### Parallel Opportunities

- T001/T002 병렬
- T005/T007/T008/T009 병렬(서로 다른 파일·심볼)
- US1의 테스트 T010~T018 전부 병렬(파일 단위)
- US2·US3 태스크는 US1 완료 이후 병렬 가능
- T036/T037 병렬

---

## Coverage Targets ↔ Tasks 매핑 확인

| Coverage Target | multi-step | 매핑 tasks | 건수 |
|---|---|---|---|
| `gcal-auth` | 3 | T001, T005, T006, T007, T016 | 5 ≥ 3 ✓ |
| `gcal-data` | 2 | T002, T003, T004 | 3 ≥ 2 ✓ |
| `gcal-calendar-choice` | — | T018, T022, T025 | 3 ≥ 1 ✓ |
| `gcal-event-format` | — | T009, T015 | 2 ≥ 1 ✓ |
| `gcal-sync` | 3 | T010, T011, T014, T019, T020, T023 | 6 ≥ 3 ✓ |
| `gcal-unlink` | — | T021 | 1 ≥ 1 ✓ |
| `gcal-per-member` | — | T030, T031, T032, T033 | 4 ≥ 1 ✓ |
| `gcal-ui-entry` | — | T017, T026, T027, T036, T037, T038 | 6 ≥ 1 ✓ |
| `gcal-status-ui` | — | T012, T024, T028 | 3 ≥ 1 ✓ |
| `gcal-error` | 2 | T008, T013, T029 | 3 ≥ 2 ✓ |
| `gcal-ical-regression` | — | T034, T035 | 2 ≥ 1 ✓ |

## Notes

- `<ts>` 마이그레이션 타임스탬프는 `prisma migrate dev --create-only` 실행 시점에 결정. migration.sql 첫 줄에 `-- [migration-type: schema-only]` 반드시 포함.
- 모든 테스트 파일은 Vitest(jsdom, vmThreads) 기존 구성을 그대로 재사용.
- iCal 경로 파일(`mcp/**`, `install.sh`)은 **이 피처에서 편집하지 않음**(FR-011). 회귀 검증은 실행·관찰만.
- 본인 토큰 경계 원칙은 코드 레벨에서 강제(T032): `userId` 매개변수를 받지 않고 `session.user.id`를 직접 씀. 리뷰 체크포인트로 명시.
- ADR-0002에 따른 라이브러리 채택(`@googleapis/calendar`, `google-auth-library`). research.md R2의 라이브러리 평가 표가 근거.
