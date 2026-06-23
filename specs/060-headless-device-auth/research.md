# Phase 0 Research: 060-headless-device-auth

## R1. device code 흐름 표준

- **Decision**: OAuth 2.0 Device Authorization Grant(RFC 8628)의 역할·상태·응답을 따른다. 소비자 개시 → `device_code`(소비자 보관)·`user_code`(사람용 짧은 코드)·`verification_uri`·`verification_uri_complete`·`expires_in`·`interval` 반환 → 사람 승인 → 소비자 폴링으로 토큰 수신.
- **Rationale**: loopback(같은 머신 콜백) 전제를 제거하는 표준이며, 폴링 모델이 서버리스·헤드리스에 자연스럽다. 자체 프로토콜 발명 회피.
- **Alternatives**: 커스텀 "승인 후 토큰을 어딘가 두고 받아가기" — 표준 부재·재발명, 기각. 헤드리스 SSH 터널/포트포워딩 — 환경 제약 크고 모바일 불가, 기각.

## R2. 상태 저장소 — Postgres 단명 테이블 (Redis 미도입)

- **Decision**: 진행 중 device 요청 상태(PENDING↔APPROVED/DENIED)를 신규 Postgres 테이블 `DeviceAuthorizationRequest`에 둔다. TTL/정리는 `expiresAt` + lazy 삭제로 흉내낸다.
- **Rationale**: 승인 요청(브라우저)과 폴링 요청(에이전트)은 **별개 요청**이고 Vercel 서버리스는 요청 간 인메모리를 공유하지 않으므로 외부 공유 가변 저장소가 필요하다. 교과서적 정본은 TTL 기반 Redis/KV지만, 헌법 II(Minimum Cost)상 신규 인프라를 도입하지 않고 기존 정본 스토어(Neon Postgres)를 재사용한다. **이 선택은 일반적 device-flow 구현(Redis)과 다르므로 data-model에 사유를 부연한다.**
- **Alternatives**: Redis/KV(Upstash 등) — 표준이나 비용·인프라 추가로 기각(단, 향후 트래픽 시 재검토 여지). 인메모리 — 서버리스에서 동작 불가, 기각.

## R3. 발급 토큰 — rawToken 무저장 (승인 후 폴링 시 발급)

- **Decision**: 승인 시에는 `status=APPROVED` + `userId`만 기록한다. **토큰은 승인 후 첫 폴링 시점에** `createPAT(userId, "CLI (device)", autoPatExpiry())`로 발급해 응답으로 1회 반환하고 요청 행을 삭제한다.
- **Rationale**: rawToken을 DB에 저장하지 않아 at-rest 노출이 0이다. 기존 PAT 모델(해시 저장·단기 만료)을 그대로 승계하고, 자동 발급 30일 만료(spec 059)도 재사용한다. 발급 평문은 전송 1회 원칙(기존 PAT와 동일).
- **Alternatives**: 승인 시 발급 + rawToken을 행에 임시 저장 후 폴링에 반환 — at-rest 평문 노출 창이 생겨 기각.

## R4. 코드 생성·검증

- **Decision**: `device_code`는 충분한 엔트로피의 무작위 문자열, **DB에는 해시(`deviceCodeHash`)만 저장**하고 폴링 시 해시 조회로 검증. `user_code`는 사람이 식별·대조하기 쉬운 짧은 코드(예: 8자, 혼동 문자 배제)이며 유니크. `verification_uri_complete`는 `verification_uri` + `user_code` 쿼리를 합쳐 탭 한 번으로 승인 화면에 도달.
- **Rationale**: device_code는 비밀이므로 PAT와 동일하게 해시 저장. user_code는 사람 대조용이라 평문(짧음).
- **Alternatives**: device_code 평문 저장 — 유출 시 위험, 기각.

## R5. 승인 화면 세션 게이트

- **Decision**: 승인 화면(`/auth/device`)은 Google 세션 필요. 미인증이면 `/auth/signin?callbackUrl=...`로 보냈다가 복귀(기존 `/bootstrap`·`/api/auth/cli` 미들웨어 패턴 재사용). 인증된 사용자에게 "이 로그인 요청을 승인하시겠습니까?(user_code 표시)" + 승인/거부.
- **Rationale**: 신원은 사람만 보유 — 본인 Google 세션으로만 승인. 기존 검증된 세션 게이트 패턴 답습으로 회귀 위험 최소화.
- **Alternatives**: 별도 인증 수단 — 중복·복잡도, 기각.

## R6. 폴링·만료·slow_down

- **Decision**: 기본 `interval` 5초, device 요청 `expires_in` 10분(RFC 8628 권장 범위). 폴링 응답: 미승인=`authorization_pending`, 과도 폴링=`slow_down`(+interval 증가), 승인=토큰 200, 거부=`access_denied`, 만료/미존재=`expired_token`. 소비자는 이 신호를 따른다.
- **Rationale**: 표준 상태 집합으로 소비자 구현이 단순·예측 가능. 무한 대기 방지(만료 결정적 종료, SC-003).
- **Alternatives**: 웹훅/푸시 — 헤드리스 소비자가 수신 엔드포인트를 못 여는 환경이라 부적합, 기각.

## R7. 정리(cleanup) 전략

- **Decision**: 별도 크론 없이 **lazy cleanup** — 폴링·승인 시 만료 행을 무효화/삭제하고, 소비(토큰 발급) 즉시 행 삭제. 만료된 코드로는 절대 토큰 발급하지 않는다. (대량 누적이 보이면 후속에서 주기 정리 추가.)
- **Rationale**: 서버리스에 상주 크론이 없고 트래픽이 소량이라 lazy로 충분. 만료 무발급으로 보안 보장(FR-008/011).
- **Alternatives**: 스케줄러/크론 잡 — 현 규모 과설계, 기각(후속 여지).

## R8. 기존 경로 보존

- **Decision**: loopback 자동 발급(`/bootstrap`·`oauth-listener.mjs`·install.sh·auth-login.mjs)·웹 세션 로그인·수기 발급(`/api/tokens`)은 변경하지 않는다. device 경로는 소비자(web_client·auth-login)에 **추가 분기**로 들어가며 브라우저 가능 환경에선 기존 경로를 쓸 수 있다.
- **Rationale**: 헌법 IV(회귀 금지). 신규 경로가 기존 인증을 깨면 안 됨.
- **Alternatives**: loopback 제거·device로 통일 — 회귀 위험·범위 초과, 기각.
