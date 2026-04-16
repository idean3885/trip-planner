# Research: OAuth CLI 인증 + MCP 런타임 재인증

## R-001: Next.js App Router 라우트 우선순위

**Decision**: `/api/auth/cli/route.ts`를 신규 생성하여 CLI 인증 처리
**Rationale**: App Router에서 specific segment(`cli/`)가 catch-all(`[...nextauth]/`)보다 우선. `/api/auth/cli` 요청은 새 라우트에서 처리되고, 나머지 `/api/auth/*` 요청은 기존 NextAuth 핸들러로 전달됨.
**Alternatives considered**: `/auth/cli/page.tsx` — 미들웨어가 로그인된 사용자를 `/`로 리다이렉트하므로 부적합.

## R-002: 미들웨어 통과 경로

**Decision**: `/api/` 접두사를 가진 라우트 사용
**Rationale**: `middleware.ts`에서 `isApiRoute` 체크 시 `return` (통과). API 라우트는 자체적으로 세션 인증을 처리하므로 미들웨어 간섭 없음.
**Alternatives considered**: 미들웨어에 `/auth/cli` 예외 추가 — 불필요한 결합도 증가.

## R-003: Auth.js callbackUrl 인코딩

**Decision**: `encodeURIComponent`로 전체 콜백 URL을 인코딩하여 `callbackUrl` 파라미터로 전달
**Rationale**: Auth.js의 `signIn("google", { redirectTo })` 콜백이 내부 쿼리 파라미터(port, state)를 포함한 URL을 올바르게 보존해야 함. SignInPage가 `searchParams.callbackUrl`을 읽어 `redirectTo`로 전달하는 기존 구조를 활용.
**Alternatives considered**: 서버 측 세션에 port/state 저장 — 불필요한 상태 관리 추가.

## R-004: Python async/sync 브리지

**Decision**: `http.server`를 스레드에서 실행, `asyncio.wait_for(loop.run_in_executor(...), timeout=120)` 래핑
**Rationale**: MCP 서버는 asyncio 기반이지만 stdlib HTTP 서버는 동기식. `run_in_executor`로 스레드에서 블로킹 호출 실행 후 asyncio 타임아웃 적용. 표준 패턴.
**Alternatives considered**: `aiohttp` 서버 — 추가 의존성 불필요, 단일 요청 처리에 과도.

## R-005: 동시 재인증 방어

**Decision**: 모듈 레벨 `asyncio.Lock`으로 재인증 직렬화
**Rationale**: 여러 MCP 도구 호출이 동시에 401을 받을 경우 브라우저가 한 번만 열려야 함. 첫 번째 재인증이 완료되면 나머지는 갱신된 토큰을 사용.
**Alternatives considered**: 각 요청이 독립 재인증 — 사용자 혼란(다중 브라우저 탭).
