# Quickstart: 헤드리스 인증 경로 (Device Authorization Grant)

**Feature**: `060-headless-device-auth` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

각 User Story의 수동/자동 회귀 케이스를 정의한다. PR 머지 게이트가 `validate-quickstart-ev.sh`로 본 문서를 검증한다.

## US1 — 헤드리스 한 번 승인 인증

### Scenario US1-1: 개시 → 사람 승인 → 자동 토큰 수신

토큰 없는 헤드리스 소비자가 `POST /api/auth/device/start` 호출 → `verification_uri_complete` 제시 → 사람이 다른 기기에서 탭·Google 로그인·승인 → 소비자가 `POST /api/auth/device/token` 폴링 200(`access_token`) 수신 → 임의 GET 인증 성공. loopback 포트 미사용.

### Scenario US1-2: 대기 중 조용한 폴링

승인 전 폴링은 `authorization_pending`(400). 소비자는 `interval`로 조용히 재시도, 사람에게 안내 반복 강요 없음.

### Scenario US1-3: 모바일 1탭 도달

`verification_uri_complete`(= uri + `user_code`)를 모바일에서 탭하면 코드 입력 없이 승인 화면이 해당 요청으로 열린다.

### Evidence

- 자동 테스트: `tests/api/device-auth.test.ts` (start 발급 형식, token 폴링 상태머신: pending→approved→200 access_token, loopback 미사용)
- 자동 테스트: `tests/components/device-approve.test.tsx` (user_code 대조·승인→APPROVED)
- 수동 체크리스트(실기기, 구현 후 기록):
  - [ ] dev.trip.idean.me에서 폰으로 verification_uri_complete 탭→승인→소비자 토큰 수신
  - [ ] 스크린샷: `docs/evidence/060-headless-device-auth/us1-approve.png`

## US2 — 만료·중단 처리

### Scenario US2-1: 미승인 타임아웃

`expires_in` 경과 후 폴링은 `expired_token`(400). 소비자는 무한 대기 없이 분명히 종료, 기존 저장 토큰 불변.

### Scenario US2-2: 거부

사람이 승인 화면에서 거부 → 폴링 `access_denied`(400) → 소비자 즉시 종료.

### Scenario US2-3: 과도 폴링 slow_down

interval보다 빠른 폴링 → `slow_down`(400) + interval 상향. 소비자가 간격 증가.

### Scenario US2-4: 만료 토큰 재인증

자동 갱신 소비자가 401 수신 → 같은 device 흐름으로 재인증 후 원 요청 성공.

### Evidence

- 자동 테스트: `tests/api/device-auth.test.ts` (expired_token·access_denied·slow_down 분기, 만료 코드 무발급)
- 자동 테스트: `tests/unit/test_web_client_device.py` (pending 대기·denied/expired 종료·401 재인증, 기존 토큰 불변)
- 수동 체크리스트(구현 후):
  - [ ] 만료(코드 만료) 후 폴링이 결정적으로 종료되는지 확인

## US3 — 기존 경로 회귀 없음

### Scenario US3-1: loopback 자동 발급 유지

브라우저 환경에서 기존 `/bootstrap`·`oauth-listener.mjs`·install.sh·auth-login.mjs 흐름이 종전대로 토큰 발급·호출 성공.

### Scenario US3-2: 수기 발급·세션 유지

수기 PAT 발급(`/api/tokens`)·웹 세션 로그인 종전대로 동작.

### Evidence

- 자동 테스트: `tests/bootstrap/oauth-listener.test.ts`·`tests/scripts/auth-login.test.ts`·`tests/api/cli-auth.test.ts` (기존 — 회귀 가드, device 추가로 깨지지 않음)
- 자동 테스트: `tests/api/tokens-manual.test.ts` (수기 발급 회귀)
- 수동 체크리스트(구현 후):
  - [ ] 브라우저 환경에서 기존 로그인 커맨드 정상 동작 확인
