# Tasks: 헤드리스 인증 경로 (Device Authorization Grant)

**Input**: Design documents from `/specs/060-headless-device-auth/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/device-auth.md, quickstart.md

**Tests**: 포함(기존 스택 Vitest/pytest로 상태머신·승인·소비자·회귀 검증).

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

## Phase 1: Setup & Foundational (blocking — 모든 US 선행)

- [ ] T001 [P] `DeviceAuthorizationRequest` 모델 + `DeviceAuthStatus` enum 추가 in `prisma/schema.prisma` [artifact: prisma/schema.prisma] [why: device-model]
- [ ] T002 schema-only 마이그레이션 생성(신규 테이블·enum, 기존 변경 0) in `prisma/migrations/` [artifact: prisma/migrations/device_auth/migration.sql] [why: device-model] [migration-type: schema-only]
- [ ] T003 device 코드 생성·해시·상태전이·만료 판정 헬퍼 in `src/lib/device-auth.ts` [artifact: src/lib/device-auth.ts] [why: device-init]

## Phase 2: User Story 1 — 헤드리스 한 번 승인 인증 (P1)

**Goal**: 헤드리스 소비자 개시 → 사람 1탭 승인 → 소비자 자동 토큰 수신.
**Independent Test**: 토큰 없는 소비자에서 start→(승인)→token 폴링 200으로 임의 GET 성공, loopback 미사용.

- [ ] T004 [US1] device 개시 엔드포인트(device_code/user_code/verification_uri_complete/expires_in/interval 발급, 행 생성) in `src/app/api/auth/device/start/route.ts` [artifact: src/app/api/auth/device/start/route.ts] [why: device-init]
- [ ] T005 [US1] 폴링 엔드포인트 핵심(deviceCodeHash 조회 → PENDING=authorization_pending / APPROVED 분기) in `src/app/api/auth/device/token/route.ts` [artifact: src/app/api/auth/device/token/route.ts] [why: device-poll]
- [ ] T006 [US1] 승인 시 폴링 발급(`createPAT`+`autoPatExpiry` 호출, rawToken 1회 반환, 행 삭제 — 무저장) in `src/app/api/auth/device/token/route.ts` [artifact: src/app/api/auth/device/token/route.ts::issueOnApproved] [why: device-token]
- [ ] T007 [US1] 승인 화면 — Google 세션 게이트(미인증 시 signin redirect) + user_code 대조·표시 in `src/app/auth/device/page.tsx` [artifact: src/app/auth/device/page.tsx] [why: device-approve]
- [ ] T008 [US1] 승인 화면 — 승인/거부 동작(APPROVED/DENIED 전이, 본인 userId 기록) in `src/app/auth/device/page.tsx` [artifact: src/app/auth/device/page.tsx::approveAction] [why: device-approve]
- [ ] T009 [US1] MCP 소비자 device 폴링 분기(헤드리스 감지 시 start→안내→interval 폴링→토큰 저장, loopback 경로 보존) in `mcp/trip_mcp/web_client.py` [artifact: mcp/trip_mcp/web_client.py] [why: device-client]
- [ ] T010 [US1] CLI 진입점 device 흐름(verification_uri_complete 안내 + 폴링, 기존 loopback 폴백 유지) in `scripts/auth-login.mjs` [artifact: scripts/auth-login.mjs] [why: device-client]
- [ ] T011 [P] [US1] 개시·폴링·발급 상태머신 테스트 in `tests/api/device-auth.test.ts` [artifact: tests/api/device-auth.test.ts] [why: device-poll]
- [ ] T012 [P] [US1] 승인 화면 테스트(세션 유무·승인/거부·user_code 대조) in `tests/components/device-approve.test.tsx` [artifact: tests/components/device-approve.test.tsx] [why: device-approve]

## Phase 3: User Story 2 — 만료·중단 처리 (P2)

**Goal**: 대기/거부/만료/slow_down/만료토큰 재인증을 결정적으로 처리.
**Independent Test**: 만료→expired_token 종료(토큰 불변), 거부→access_denied 종료, 과도폴링→slow_down, 401→재인증.

- [ ] T013 [US2] 폴링 오류 분기(slow_down[interval 상향]·access_denied·expired_token, 만료 시 무발급) in `src/app/api/auth/device/token/route.ts` [artifact: src/app/api/auth/device/token/route.ts::pollErrors] [why: device-poll]
- [ ] T014 [US2] 만료·소비 행 lazy 정리 + 만료 코드 무발급 보장 in `src/lib/device-auth.ts` [artifact: src/lib/device-auth.ts::cleanupExpired] [why: device-cleanup]
- [ ] T015 [US2] MCP 소비자 상태 처리(pending 조용한 대기·denied/expired 종료·slow_down 간격증가·401 재인증, 기존 토큰 불변) in `mcp/trip_mcp/web_client.py` [artifact: mcp/trip_mcp/web_client.py::device_poll] [why: device-client]
- [ ] T016 [P] [US2] 소비자 폴링·재인증 테스트 in `tests/unit/test_web_client_device.py` [artifact: tests/unit/test_web_client_device.py] [why: device-client]

## Phase 4: User Story 3 — 기존 경로 회귀 없음 (P2)

**Goal**: loopback·세션·수기 발급 불변.
**Independent Test**: 기존 인증 테스트 전부 통과.

- [ ] T017 [US3] 기존 인증 경로 회귀 가드(loopback·alias·수기 발급 영향 없음 확인·보강) in `tests/api/cli-auth.test.ts` [artifact: tests/api/cli-auth.test.ts] [why: device-regression]

## Phase 5: Polish & Cross-Cutting

- [ ] T018 [P] OpenAPI/문서에 device 흐름 추가 + Redis 미도입(Postgres 단명테이블) 사유 부연 in `src/lib/openapi.ts` [artifact: src/lib/openapi.ts] [why: device-init]
- [ ] T019 [P] towncrier 단편(헤드리스 device 인증, 도메인 추상화·합쇼체) in `changes/793.feat.md` [artifact: changes/793.feat.md] [why: device-regression]
- [ ] T020 quickstart Evidence 갱신(수동 체크리스트 체크·스크린샷 경로) in `specs/060-headless-device-auth/quickstart.md` [artifact: specs/060-headless-device-auth/quickstart.md] [why: device-approve]

## Dependencies

- **Phase 1(T001~T003)**: 전 스토리 선행. T001→T002(모델→마이그레이션). T003은 T004~ 선행.
- **US1(P1)**: MVP. T004~T010 구현, T011/T012 테스트. T006는 T005 후.
- **US2(P2)**: US1의 token route(T005)·lib(T003)·client(T009) 위에 오류·정리·재인증 추가.
- **US3(P2)**: 독립(기존 테스트). 다른 스토리와 병행 가능.
- **Polish**: 전 스토리 후.

## Parallel 예시

- T001 [P](schema) 과 T003(lib)는 파일 다름 → 병행 가능(단 T002는 T001 후).
- 테스트 T011/T012/T016 [P]는 서로 다른 파일 → 병행.
- Polish T018/T019 [P] 병행.

## Implementation Strategy

- **MVP = US1**(P1): 헤드리스 개시→승인→토큰 수신 happy path. 이것만으로 핵심 가치(수기 PAT 0, 1탭 승인) 전달.
- 이후 US2(견고성)·US3(회귀 가드)·Polish 순.
- 머지 단위: feature(060) → develop PR. 구현 후 dev.trip.idean.me 실기기 승인 검증 권장(폰 1탭).
