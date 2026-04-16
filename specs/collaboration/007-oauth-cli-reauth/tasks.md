# Tasks: OAuth CLI 인증 + MCP 런타임 재인증

**Input**: Design documents from `/specs/007-oauth-cli-reauth/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: 기존 PAT 생성 로직을 공유 헬퍼로 추출하여 재사용 기반 마련

- [ ] T001 Create shared PAT creation helper in `src/lib/token-helpers.ts` — createPAT(userId, name, expiresAt?) 함수 추출
- [ ] T002 Refactor POST /api/tokens to use createPAT helper in `src/app/api/tokens/route.ts`

**Checkpoint**: 기존 토큰 생성 기능이 헬퍼를 통해 동일하게 동작

---

## Phase 2: Foundational — CLI 인증 서버 엔드포인트

**Purpose**: install.sh와 MCP 모두가 재사용하는 서버 측 인증 엔드포인트

**⚠️ CRITICAL**: US1, US2, US3 모두 이 엔드포인트에 의존

- [ ] T003 Create CLI auth route handler GET /api/auth/cli in `src/app/api/auth/cli/route.ts` — port/state 검증, 세션 체크, PAT 발급, localhost 리다이렉트

**Checkpoint**: 브라우저에서 `/api/auth/cli?port=8080&state=<32hex>` 접속 시 Google 로그인 → localhost 콜백으로 토큰 전달 확인

---

## Phase 3: User Story 1 — install.sh 브라우저 원클릭 인증 (Priority: P1) 🎯 MVP

**Goal**: install.sh에서 PAT 수동 복사-붙여넣기를 브라우저 OAuth 1회로 대체

**Independent Test**: PAT 없는 상태에서 install.sh 실행 → 브라우저 로그인 → 키체인에 토큰 자동 저장

### Implementation for User Story 1

- [ ] T004 [US1] Replace Step 6 PAT section in `scripts/install.sh` — Python inline HTTP server 기동, browser open, 콜백 수신, 키체인 저장, 120초 타임아웃, 수동 폴백 유지

**Checkpoint**: install.sh 실행 시 브라우저 인증으로 토큰 자동 저장, 타임아웃 시 수동 입력 폴백

---

## Phase 4: User Story 2 — MCP 런타임 자동 재인증 (Priority: P2)

**Goal**: MCP 도구 호출 시 401 응답 → 브라우저 재인증 → 키체인 갱신 → 요청 재시도

**Independent Test**: 만료된 토큰으로 MCP 도구 호출 → 브라우저 재인증 후 원래 요청 자동 성공

### Implementation for User Story 2

- [ ] T005 [US2] Add `_authenticate_via_browser()` async function in `mcp/trip_mcp/web_client.py` — localhost HTTP server + webbrowser.open + asyncio Lock + 120초 타임아웃
- [ ] T006 [US2] Add `_save_keychain_pat(token)` helper in `mcp/trip_mcp/web_client.py` — security delete + add
- [ ] T007 [US2] Add `_recreate_client(token)` helper in `mcp/trip_mcp/web_client.py` — global client 교체
- [ ] T008 [US2] Modify `api_request()` 401 handling in `mcp/trip_mcp/web_client.py` — 재인증 시도 → 성공 시 키체인 갱신 + 클라이언트 재생성 + 1회 재시도

**Checkpoint**: 만료 토큰으로 API 호출 → 브라우저 열림 → 로그인 → 원래 요청 자동 재시도 성공

---

## Phase 5: User Story 3 — PAT 미설정 시 초기 인증 (Priority: P3)

**Goal**: PAT가 없는 상태에서도 MCP 첫 호출 시 브라우저 인증으로 자동 발급

**Independent Test**: 키체인/환경변수 모두 PAT 없는 상태에서 MCP 도구 호출 → 브라우저 인증 → 정상 처리

### Implementation for User Story 3

- [ ] T009 [US3] Modify empty PAT handling in `mcp/trip_mcp/web_client.py` `api_request()` — PAT 미설정 시 즉시 에러 대신 `_authenticate_via_browser()` 시도

**Checkpoint**: PAT 미설정 상태에서 MCP 도구 호출 → 브라우저 인증 → 토큰 발급 → 정상 응답

---

## Phase 6: Tests & Polish

**Purpose**: 자동화 테스트 + 기존 테스트 보강

- [ ] T010 [P] Create CLI auth route tests in `tests/api/cli-auth.test.ts` — port/state 검증, 미로그인 리다이렉트, 로그인 시 PAT 발급+localhost 리다이렉트
- [ ] T011 [P] Create web_client reauth tests in `tests/unit/test_web_client_reauth.py` — 401 재인증, 재시도, 실패 폴백, 키체인 저장, 클라이언트 재생성, 동시 재인증 Lock
- [ ] T012 [P] Add /api/auth/cli middleware pass-through test in `tests/middleware.test.ts`
- [ ] T013 Run full test suite validation — `npx vitest run` + `pytest tests/` + `npx tsc --noEmit`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — 즉시 시작
- **Phase 2 (Foundational)**: Phase 1 완료 필요 (createPAT 헬퍼 사용)
- **Phase 3 (US1)**: Phase 2 완료 필요 (/api/auth/cli 엔드포인트 사용)
- **Phase 4 (US2)**: Phase 2 완료 필요 (/api/auth/cli 엔드포인트 사용)
- **Phase 5 (US3)**: Phase 4 완료 필요 (_authenticate_via_browser 재사용)
- **Phase 6 (Tests)**: Phase 5 완료 필요 (모든 구현 완료 후 테스트)

### User Story Dependencies

- **US1 (install.sh)**: Phase 2 이후 독립 실행 가능
- **US2 (MCP 재인증)**: Phase 2 이후 독립 실행 가능, US1과 병렬 가능
- **US3 (PAT 미설정)**: US2의 _authenticate_via_browser() 구현에 의존

### Parallel Opportunities

- T001, T002 순차 (T002가 T001에 의존)
- US1 (T004)과 US2 (T005-T008)는 Phase 2 이후 병렬 가능
- T010, T011, T012 모두 [P] — 테스트 병렬 작성 가능

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: token-helpers.ts 추출 + tokens route 리팩터
2. Phase 2: /api/auth/cli 라우트 생성
3. Phase 3: install.sh 브라우저 인증 통합
4. **STOP and VALIDATE**: install.sh 수동 테스트

### Incremental Delivery

1. Setup + Foundational → 서버 엔드포인트 준비
2. US1 → install.sh 브라우저 인증 (MVP)
3. US2 → MCP 런타임 재인증
4. US3 → PAT 미설정 초기 인증
5. Tests → 전체 테스트 스위트 통과

---

## Notes

- 기존 PAT 모델/스키마 변경 없음 — Prisma 마이그레이션 불필요
- macOS 전용 기능 (keychain, open 명령) — 다른 OS는 수동 폴백
- install.sh의 기존 Step 6 수동 입력은 폴백으로 유지
- 브라우저 인증 타임아웃: 120초
