# Contract — `GET /api/trips/<id>/gcal/status` (unregistered 확장)

**Created**: 2026-04-22
**Scope**: spec 021의 미등록 상태 신호를 기존 `/status` 응답에 병렬 추가.

## 변경 요약

기존 응답 분기(`linked:true` / `linked:false`)는 유지. 본인이 최근 미등록 감지된 상태(쿠키 플래그 보유)면 응답에 **최상위 `unregistered: true`** 필드를 병렬 추가. 플래그 없으면 필드 미출력(역호환).

## Request

변경 없음. 기존과 동일.

## Responses

### 변경 없음

- `401 unauthenticated` / `403 not_a_member` / `400 bad_trip_id` — 그대로.

### 기존 응답에 병렬 추가

- `200 { linked: true, link: ..., mySubscription?: ..., unregistered?: true }`
- `200 { linked: false, scopeGranted: boolean, unregistered?: true }`

**`unregistered` 필드**:

- 존재: 현재 사용자가 Testing 모드 제약으로 거부된 직후(쿠키 플래그 TTL 이내)이거나 최근 API 호출에서 403(unregistered) 받은 흔적이 세션에 남은 경우.
- 미존재: 정상.

## 서버 동작

1. 인증·멤버 체크(기존).
2. 요청 헤더에서 `gcal-unregistered` 쿠키를 읽는다.
3. 쿠키가 있으면:
   - TTL 검사 — 기록 시각이 10분 이내면 `unregistered: true` 필드를 응답 바디에 추가.
   - 응답 직전에 쿠키를 즉시 만료시킨다(Max-Age=0).
4. 기존 `TripCalendarLink` / `mySubscription` 응답 분기 로직 수행.

## Compatibility

- 기존 클라이언트가 `unregistered` 필드를 무시해도 기능 손실 없음(optional 필드).
- 본 피처의 클라이언트(`GCalLinkPanel`)는 `unregistered === true`면 모든 기존 분기보다 **우선하여** 미등록 안내 카드로 렌더.

## 관찰

서버 로그에 `unregistered` 응답 카운트 추가 관찰 포인트. 증가 추세가 계속 높으면 Test user 등록 요청 유입이 늘어난다는 신호 — ADR 0004의 "심사 재고려 트리거" 중 "사용자 수" 조건 판단 근거.
