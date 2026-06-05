---

description: "Task list for 059-cli-oauth-login"
---

# Tasks: API/CLI 인증 — 범용 OAuth 로그인 커맨드 + 단기 만료 토큰

**Input**: Design documents from `/specs/059-cli-oauth-login/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: 포함(인증은 회귀 비용이 커 CI 가드 필수).

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

## Phase 1: Setup

(신규 의존성·구조 없음 — 생략)

## Phase 2: Foundational

- [x] T001 자동 발급 토큰 만료 기본 상수/헬퍼 추가(AUTO_PAT_TTL_DAYS=30, now+TTL 계산) in src/lib/token-helpers.ts [artifact: src/lib/token-helpers.ts] [why: token-expiry]

## Phase 3: User Story 1 - 단일 커맨드 로그인 (P1)

**Goal**: 임의 소비자가 단일 커맨드로 브라우저 OAuth 로그인 → 토큰 키체인 저장 → API 호출.
**Independent Test**: 토큰 없는 상태에서 커맨드 1회 → 로그인 → API GET 성공.

- [x] T002 [US1] 범용 OAuth 로그인 독립 진입점 — oauth-listener 흐름 래핑(브라우저 열기·콜백 수신·키체인 저장·성공/실패 안내·종료코드) in scripts/auth-login.mjs [artifact: scripts/auth-login.mjs] [why: cli-login] [multi-step: 2]
- [x] T003 [US1] 동시 다발 로그인 single-flight + state/포트 실패 안내 정리(리스너 재사용 경계) in scripts/auth-login.mjs [artifact: scripts/auth-login.mjs] [why: cli-login] [multi-step: 2]
- [x] T004 [P] [US1] 테스트: 진입점 인자/실패 경로(state 불일치·타임아웃 시 토큰 미변경·종료코드) in tests/scripts/auth-login.test.ts [artifact: tests/scripts/auth-login.test.ts] [why: cli-login] [multi-step: 2]

## Phase 4: User Story 2 - 단기 만료 + 만료 재인증 (P1)

**Goal**: 자동 발급에 만료 부여, 만료 시 재인증(자동 갱신/안내).
**Independent Test**: 자동 발급 토큰에 만료 존재, 만료 토큰 호출 시 401·재인증 경로.

- [x] T005 [US2] /api/auth/cli 의 createPAT 호출에 단기 만료(now+30일) 적용 in `src/app/api/auth/cli/route.ts` [artifact: src/app/api/auth/cli/route.ts] [why: token-expiry]
- [x] T006 [US2] /bootstrap 의 createPAT 호출에 단기 만료(now+30일) 적용 in `src/app/bootstrap/page.tsx` [artifact: src/app/bootstrap/page.tsx] [why: token-expiry]
- [x] T007 [US2] MCP 401 자동 재인증이 만료 토큰에도 동작함을 확인·보강(single-flight 유지) in mcp/trip_mcp/web_client.py [artifact: mcp/trip_mcp/web_client.py] [why: reauth] [multi-step: 2]
- [x] T008 [US2] 일반 소비자 만료 시 "다시 로그인" 안내 경로(진입점 재실행 안내 메시지) in scripts/auth-login.mjs [artifact: scripts/auth-login.mjs] [why: reauth] [multi-step: 2]
- [x] T009 [P] [US2] 테스트: 자동 발급 expiresAt 부여(무만료 아님, cli-auth) + 만료 토큰 인증 거부(auth-helpers) in tests/api/cli-auth.test.ts, tests/lib/auth-helpers.test.ts [artifact: tests/api/cli-auth.test.ts|tests/lib/auth-helpers.test.ts] [why: token-expiry]

## Phase 5: User Story 3 - 수기 발급 폴백 보존 (P2)

**Goal**: 수기 발급·정책 불변.
**Independent Test**: 수기 발급 토큰 만료 정책이 자동 발급 변경에 영향받지 않음.

- [x] T010 [US3] 테스트: 수기 발급(/api/tokens) 만료 정책 불변(선택·무만료 허용) 회귀 가드 in tests/api/tokens-manual.test.ts [artifact: tests/api/tokens-manual.test.ts] [why: no-regression]

## Phase 6: User Story 4 - 기존 경로 회귀 가드 (P2)

**Goal**: install·MCP·웹 세션 회귀 없음.
**Independent Test**: 기존 인증 경로 정상.

- [x] T011 [US4] 테스트: getAuthUserId Bearer/세션 분기·만료 거부 회귀 in tests/lib/auth-helpers.test.ts [artifact: tests/lib/auth-helpers.test.ts] [why: no-regression]

## Phase 7: Polish & Cross-Cutting

- [x] T012 인증 사용 가이드(범용 커맨드 1회 로그인·만료/재로그인·수기 폴백) in docs/auth-cli.md [artifact: docs/auth-cli.md] [why: cli-login] [multi-step: 2]
- [x] T013 전체 회귀 — `npx vitest run` + typecheck + 변경 파일 prettier/eslint [artifact: tests] [why: no-regression]

## Dependencies

- T001(만료 헬퍼)은 T005·T006 선행. T002(진입점)은 T003·T008 선행(같은 파일 순차).
- US 우선순위 P1(US1·US2) → P2(US3·US4).
- 같은 파일(scripts/auth-login.mjs: T002·T003·T008)은 순차, [P] 아님.

## MVP

US1 + US2(P1) = 범용 로그인 + 단기 만료/재인증. 폴백·회귀 가드는 보존 성격.
