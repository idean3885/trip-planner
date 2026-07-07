# API/CLI 인증 가이드

trip API 를 CLI·스크립트·AI 에이전트에서 호출할 때의 인증 방법. 어느 경로든 최종 자격증명은 단기 만료 PAT(`tp_...`)이며, 차이는 **발급 방법**이다.

## 1. 브라우저 OAuth 자동 발급 (권장)

수기 토큰 발급·복사 없이, 브라우저 Google 로그인 한 번으로 토큰을 OS 키체인에 저장한다. 맥북 한 줄 설치가 실질적 기본 진입점이다.

```bash
# MCP 설치까지 한 번에 (맥북)
curl -sSL https://raw.githubusercontent.com/idean3885/trip-planner/main/scripts/install.sh | bash

# 인증만 다시 하고 싶을 때
node scripts/auth-login.mjs
```

- 브라우저가 열리면 Google 로그인을 완료한다.
- 토큰이 키체인(service `trip-planner`, account `api-pat`)에 저장된다 — `install.sh`·MCP 와 같은 위치라 한 번 로그인하면 모두 공유한다.
- 이후 API 호출은 이 토큰으로 동작한다.
- 환경변수: `TRIP_BOOTSTRAP_BASE_URL`(기본 `https://trip.idean.me`, dev 변경용), `TRIP_BOOTSTRAP_TIMEOUT_SEC`(기본 300).

## 2. 디바이스 인증 (헤드리스 환경)

브라우저를 띄울 수 없는 서버·컨테이너 등 헤드리스 환경용. 다른 기기(폰·노트북)의 브라우저로 승인한다.

```bash
node scripts/auth-login.mjs --device
# 또는
TRIP_DEVICE_AUTH=1 node scripts/auth-login.mjs
```

- 커맨드가 `user_code` 와 승인 URL 을 출력한다.
- 다른 기기의 브라우저에서 그 URL(또는 `https://trip.idean.me/device`)을 열고 Google 로그인 후 `user_code` 를 확인·승인한다.
- 승인되면 CLI 가 폴링으로 토큰을 받아 키체인에 저장한다.
- MCP(`web_client.py`)도 `--device`/`TRIP_DEVICE_AUTH` 로 같은 흐름을 탄다.

## 3. 토큰 만료 / 재로그인

자동 발급 토큰은 **단기 만료(기본 30일)**를 가진다. 장수명 토큰을 무기한 보관하지 않기 위함이다.

- **MCP**: 토큰 만료(401) 시 자동으로 재인증한다(사용자 조작 불필요).
- **일반 소비자(스크립트·curl)**: 만료되면 API 가 401 을 돌려준다. 위 로그인 커맨드를 다시 실행하면 된다.

## 4. 수기 발급 (고급 · 폴백)

브라우저를 열 수 없고 위 방법도 어려운 경우, 웹에서 직접 발급한다. PAT 는 무제한 토큰이라 탈취 위험이 있으니 일반 사용자에게는 권장하지 않는다.

- `trip.idean.me` → `/settings` → "API 토큰" → "수동 발급 (고급)" 에서 토큰 생성(원문은 1회만 노출).
- 수기 발급 토큰의 만료는 사용자가 정한다(무만료 가능). 자동 발급의 단기 만료 정책과 별개다.

## 5. 토큰 위치 규약

| 소비자 | 키체인 service | account |
|--------|----------------|---------|
| 범용 커맨드·install.sh·MCP | `trip-planner` | `api-pat` |

토큰 원문은 키체인에만 둔다. 레포·로그·평문 파일에 저장하지 않는다.
