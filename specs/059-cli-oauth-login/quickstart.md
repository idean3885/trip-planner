# Quickstart / 검증: 059-cli-oauth-login

### Evidence

#### 자동 (CI/로컬)
- `npx vitest run` 그린:
  - 자동 발급 경로(`/api/auth/cli`, `/bootstrap`)가 `expiresAt`(now+30일, 무만료 아님)을 부여한다.
  - 만료된 토큰은 인증 거부(`auth-helpers` → null/401).
  - 수기 발급(`/api/tokens`)은 만료 정책 불변(회귀 가드).
  - token-helpers 단기 만료 상수/헬퍼 단위 테스트.
- `npx tsc --noEmit`, 변경 파일 prettier/eslint 통과.

#### 수동 (실환경)
- 토큰 없는 상태에서 `node scripts/auth-login.mjs` 1회 → 브라우저 로그인 → 키체인 저장 → 임의 API GET 성공.
- 발급 토큰 `/settings` 목록에서 만료 시각 표시 확인.
- 만료(또는 폐기) 후 호출: MCP 자동 재인증 / 일반 소비자 재로그인 안내.
- 기존 install.sh·웹 로그인 회귀 없음.
