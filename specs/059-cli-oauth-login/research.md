# Phase 0 Research: 059-cli-oauth-login

## R1. 범용 OAuth 로그인 커맨드

- **Decision**: install.sh의 브라우저 OAuth 흐름을 독립 실행 진입점(`scripts/auth-login.mjs`)으로 추출. 기존 `scripts/bootstrap/oauth-listener.mjs`(로컬 수신·state CSRF·키체인 저장)를 그대로 호출. 사용자는 `node scripts/auth-login.mjs`(또는 래퍼) 1회 실행 → 브라우저 `/api/auth/cli` 로그인 → 토큰 키체인 저장.
- **Rationale**: 신규 의존성 0, 검증된 흐름 재사용. install.sh·MCP·임의 헬퍼가 같은 진입점을 공유.
- **Alternatives**: MCP CLI 서브커맨드(비-MCP 소비자 무거움), 별도 바이너리(빌드·배포 인프라 공수) — 기각(이슈 #783 확정).

## R2. 자동 발급 토큰 단기 만료

- **Decision**: `createPAT`는 시그니처 유지(`expiresAt` 3번째 인자). 자동 발급 호출처 2곳(`/api/auth/cli` route, `/bootstrap` page)이 `now + 30일`을 넘기도록 변경. 기본값 상수는 `token-helpers.ts`에 둔다(예: `AUTO_PAT_TTL_DAYS=30`). 수기 발급(`/api/tokens`)은 불변.
- **Rationale**: 스키마 변경 없음(`expiresAt` 기존). 만료 검증은 `auth-helpers.ts`가 이미 수행(`expiresAt < now → null`). 장수명 토큰 상시 보관 위험 감소.
- **Alternatives**: 무만료 유지(보안 동기 미해결), 단기 JWT 전환(refresh 복잡도) — 기각.

## R3. 만료 시 재인증

- **Decision**: MCP는 기존 `web_client.py` 401 자동 재인증(asyncio.Lock single-flight) 패턴을 그대로 활용 — 만료 토큰도 401을 받으면 자동 재로그인. 일반 소비자(스크립트·헬퍼)는 401 시 "다시 로그인하세요: <커맨드>" 안내를 받는다(범용 커맨드 재실행). 동시 다발 인증은 리스너/락으로 single-flight.
- **Rationale**: 자동 갱신은 런타임 통합만 안전하게 가능. 임의 소비자에 자동 브라우저 팝업을 강요하지 않음(예측 가능).
- **Alternatives**: 모든 소비자 자동 팝업(임의 스크립트에서 위험·예측 불가) — 기각.

## R4. 회귀 가드

- **Decision**: install.sh·MCP 재인증·웹 세션·수기 발급(`/api/tokens`)은 변경 없이 동작 유지. 단기 만료 추가가 기존 수기 발급 정책(선택·무만료)에 영향 없도록 자동 발급 경로에만 적용.
- **Rationale**: 인증은 모든 기능의 관문 — 회귀 비용이 크다. 변경면을 자동 발급 2곳으로 최소화.
