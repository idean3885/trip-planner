# API/CLI 인증 가이드

trip API 를 CLI·스크립트에서 호출할 때의 인증 방법.

## 1. 범용 OAuth 로그인 (권장)

수기 토큰 발급·복사 없이, 단일 커맨드로 브라우저 Google 로그인 후 토큰을 OS 키체인에 저장한다.

```bash
node scripts/auth-login.mjs
```

- 브라우저가 열리면 Google 로그인을 완료한다.
- 토큰이 키체인(service `trip-planner`, account `api-pat`)에 저장된다 — `install.sh`·MCP 와 같은 위치라 한 번 로그인하면 모두 공유한다.
- 이후 API 호출은 이 토큰으로 동작한다.
- 환경변수: `TRIP_BOOTSTRAP_BASE_URL`(기본 `https://trip.idean.me`, dev 변경용), `TRIP_BOOTSTRAP_TIMEOUT_SEC`(기본 300).

## 2. 토큰 만료 / 재로그인

자동 발급 토큰은 **단기 만료(기본 30일)**를 가진다. 장수명 토큰을 무기한 보관하지 않기 위함이다.

- **MCP**: 토큰 만료(401) 시 자동으로 재인증한다(사용자 조작 불필요).
- **일반 소비자(스크립트·curl)**: 만료되면 API 가 401 을 돌려준다. 위 로그인 커맨드를 다시 실행하면 된다.

## 3. 수기 발급 (폴백)

브라우저를 열 수 없는 환경이거나 토큰을 미리 세팅해두고 싶을 때는 웹에서 직접 발급한다.

- `trip.idean.me` → `/settings/tokens` → 토큰 생성(원문은 1회만 노출).
- 수기 발급 토큰의 만료는 사용자가 정한다(무만료 가능). 자동 발급의 단기 만료 정책과 별개다.

## 4. 토큰 위치 규약

| 소비자 | 키체인 service | account |
|--------|----------------|---------|
| 범용 커맨드·install.sh·MCP | `trip-planner` | `api-pat` |

토큰 원문은 키체인에만 둔다. 레포·로그·평문 파일에 저장하지 않는다.
