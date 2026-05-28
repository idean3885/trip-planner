# Contract — OAuth 로컬 HTTP listener

## 흐름

```text
1. install 스크립트가 Node helper 실행:
     node scripts/bootstrap/oauth-listener.mjs

2. listener가 사용 가능한 랜덤 포트(localhost:0 → kernel 할당)에 바인딩
     → 예: localhost:54321

3. listener가 다음 URL을 stdout에 출력:
     CALLBACK_URL=http://localhost:54321/oauth/callback

4. install 스크립트가 사용자 브라우저로 OAuth authorize URL 열기:
     https://trip.idean.me/oauth/authorize
       ?provider=google
       &redirect_uri=http://localhost:54321/oauth/callback
       &state=<random>
       &device_name=<hostname>

5. 사용자가 브라우저에서 Google OAuth 동의 → trip-planner가 사용자 인증

6. trip-planner가 callback URL로 redirect (302):
     http://localhost:54321/oauth/callback?state=<>&token=<one-time code>

7. listener가 GET 요청 수령 → state 검증 → token으로 PAT 발급 API 호출:
     POST https://trip.idean.me/api/tokens
       Authorization: Bearer <one-time code>
       Body: { name: "<hostname> (auto YYYY-MM-DD)" }
     → 응답: { token: "tp_..." }

8. listener가 PAT을 keychain·파일에 저장 + stdout에 "OAUTH_OK" 출력 후 종료

9. 브라우저 페이지에 "설치가 완료되었습니다. 이 창을 닫아주세요" 표시
```

## listener 설정

| 항목 | 값 |
|------|------|
| 바인딩 주소 | localhost (127.0.0.1) 만 — 외부 노출 금지 |
| 포트 | 0(kernel 할당) |
| timeout | 60초 (사용자 인증 마칠 시간) |
| 콜백 횟수 | 1회 수령 후 즉시 종료 |
| HTTP method | GET 만 처리 (콜백) |
| Path | `/oauth/callback` (그 외 404) |

## one-time code · state 검증

* OAuth state는 listener가 randomBytes(16) 생성 + URL에 포함 + 콜백에서 검증. 일치 안 하면 PAT 발급 시도 안 함
* one-time code(authorization code 자리)는 listener가 PAT 발급 API 1회 호출 후 즉시 소진
* PAT 발급 API는 trip-planner 서버가 one-time code → 사용자 세션 검증 → Token 생성

## 보안 룰

* PAT은 stdout·stderr·log에 평문 출력 안 함
* listener 자체는 localhost 바인딩이라 외부 접근 불가
* state mismatch 시 listener는 PAT 발급 시도 없이 종료 + 진단 메시지

## 종료 코드

| 코드 | 의미 |
|------|------|
| 0 | PAT 발급·저장 성공 |
| 1 | timeout (60초 안에 콜백 없음) |
| 2 | state mismatch |
| 3 | PAT 발급 API 실패 |
| 4 | keychain 저장 실패 |
