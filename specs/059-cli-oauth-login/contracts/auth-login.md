# Contract: 범용 OAuth 로그인 + 단기 만료 (059)

신규 HTTP 엔드포인트 없음. 기존 `/api/auth/cli`(로그인 콜백→PAT 발급) 재사용.

## CLI 커맨드 (신규 진입점)

`node scripts/auth-login.mjs` (또는 래퍼 스크립트)
- 동작: 로컬 1회용 수신 포트 오픈 → 브라우저로 `https://trip.idean.me/api/auth/cli?port=<p>&state=<s>` 열기 → 콜백으로 토큰 수신 → OS 키체인 저장.
- 출력: 성공/실패 분명한 안내. 실패(타임아웃·포트 점유·state 불일치) 시 토큰 미변경.
- 종료코드: 성공 0 / 실패 비0.

## 발급 만료 (서버)

- `/api/auth/cli` 와 `/bootstrap` 의 `createPAT(...)` 호출이 `expiresAt = now + 30일` 부여.
- 수기 발급 `/api/tokens` 는 불변(만료 선택, 무만료 허용).

## 재인증 계약

- 만료/무효 토큰 → API 는 기존대로 401.
- MCP 소비자: 401 → 자동 재인증(기존 패턴) → 원 요청 재시도.
- 일반 소비자: 401 → "다시 로그인: <커맨드>" 안내(자동 팝업 강요 안 함).

## 불변(회귀 금지)

- install.sh, MCP 401 재인증, 웹 Google 세션 로그인, 수기 발급/목록/폐기 — 동작 유지.
