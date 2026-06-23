# Contract: Device Authorization Grant (060)

RFC 8628 기반. 신규 엔드포인트 2 + 승인 화면 1. 기존 PAT 발급(`createPAT`)·세션 게이트 재사용.

## 1. 개시 — `POST /api/auth/device/start`

소비자(에이전트·CLI·MCP)가 인증을 개시한다. **인증 불필요**(아직 토큰 없음).

**Request**: 본문 없음(또는 `{ "label"?: string }` — 발급 토큰 표시명).

**Response 200**:
```json
{
  "device_code": "<opaque, 소비자 보관·이후 폴링에 사용>",
  "user_code": "ABCD-EFGH",
  "verification_uri": "https://trip.idean.me/auth/device",
  "verification_uri_complete": "https://trip.idean.me/auth/device?user_code=ABCD-EFGH",
  "expires_in": 600,
  "interval": 5
}
```
- 서버: `deviceCodeHash`·`userCode`·`status=PENDING`·`expiresAt=now+600s`·`interval=5` 행 생성.
- `device_code`는 응답에서 1회 평문 노출(DB엔 해시만).

## 2. 폴링 — `POST /api/auth/device/token`

소비자가 승인 완료를 폴링한다. **인증 불필요**(device_code 자체가 자격).

**Request**:
```json
{ "device_code": "<개시에서 받은 값>" }
```

**Response (상태별)**:

| 상황 | HTTP | 본문 `error`/결과 |
|------|------|-------------------|
| 미승인(대기) | 400 | `authorization_pending` |
| 과도 폴링 | 400 | `slow_down` (서버가 interval 상향) |
| 승인됨 | 200 | `{ "access_token": "tp_...", "token_type": "bearer", "expires_at": "<+30일>" }` — **발급 즉시 행 삭제** |
| 거부됨 | 400 | `access_denied` (행 삭제) |
| 만료/미존재 | 400 | `expired_token` |

- 승인 분기에서만 `createPAT(userId, label ?? "CLI (device)", autoPatExpiry())` 호출. rawToken은 이 응답으로만 1회 반환.
- 만료(`now > expiresAt`)면 상태 불문 `expired_token`, 토큰 미발급.

## 3. 승인 화면 — `GET/POST /auth/device`

사람이 자기 기기 브라우저에서 연다. **Google 세션 필요**.

- **미인증** → `/auth/signin?callbackUrl=/auth/device?user_code=...` 로 redirect, 로그인 후 복귀(기존 `/bootstrap` 패턴).
- **인증** → `user_code`로 PENDING 요청 조회·표시 후 **승인/거부** 버튼.
  - 승인(POST) → `status=APPROVED`, `userId=세션 사용자`. (토큰은 여기서 만들지 않음.)
  - 거부(POST) → `status=DENIED`.
  - 만료/미존재 user_code → "만료되었거나 잘못된 요청" 안내(무발급).
- 모바일 1탭 도달: `verification_uri_complete`가 `user_code`를 쿼리로 실어 화면이 자동 대조.

## 불변 (회귀 금지)

- 기존 `/api/auth/cli`(→/bootstrap alias)·`/bootstrap`·`oauth-listener.mjs`·install.sh·웹 세션 로그인·수기 발급(`/api/tokens`) 동작 유지.
- 발급 토큰은 기존 PAT(해시 저장·폐기·목록·만료) 그대로. 후속 API 호출은 기존 PAT 권한 검증을 거친다.

## 소비자 계약 (MCP·CLI)

- PAT 미설정 또는 401 + **헤드리스(브라우저-리스너 co-location 불가)** 감지 시: `POST /device/start` → 사용자에게 `verification_uri_complete` 제시 → `interval`로 `POST /device/token` 폴링 → 200 수신 시 토큰 저장·재시도.
- `authorization_pending`은 조용히 대기, `slow_down`은 간격 증가, `expired_token`/`access_denied`는 분명히 종료(기존 토큰 불변).
- 브라우저 가능 환경에선 기존 loopback 경로 사용(폴백/선택).
