# Contract — `GET /api/trips/[id]/gcal/status`

**Created**: 2026-04-22
**Owner**: 020 피처 산출물(단, 엔드포인트 자체는 spec 018에서 도입, spec 019에서 v2.9.0 공유 모델 수용).
**Scope**: 본 피처가 **변경하는 응답 분기**와 **변경하지 않는 부분**을 명시한다.

## Request

- Method: `GET`
- Path: `/api/trips/[id]/gcal/status`
- Auth: 세션 쿠키(Auth.js). 필요 시 Bearer PAT도 허용(`getAuthUserId` 공통).
- Path params: `id` — 여행 ID(정수).
- Query: 없음.
- Body: 없음.

## Responses

### 변경 없음(기존 정의 유지)

| Status | Shape | 발생 조건 |
|---|---|---|
| 401 | `{ error: "unauthenticated" }` | 세션/토큰 없음 |
| 400 | `{ error: "bad_trip_id" }` | `id`가 숫자 아님 |
| 403 | `{ error: "not_a_member" }` | 호출자가 해당 여행의 `TripMember`가 아님 |
| 200 | `{ linked: true, link: GCalLinkState, mySubscription?: { status, lastError } \| null }` | `TripCalendarLink`가 존재. (기존 분기 그대로) |

### 본 피처 변경 — `linked:false` 정본화

| Status | Shape | 발생 조건 |
|---|---|---|
| 200 | `{ linked: false, scopeGranted: boolean }` | `TripCalendarLink`가 **없으면** 본인 per-user `GCalLink` 존재 여부와 **무관하게** 이 응답. |

- 이전 동작: `TripCalendarLink`가 없고 본인 `GCalLink`가 있으면 `linked:true`를 폴백 응답.
- 변경 후: **폴백 삭제**. 오직 `TripCalendarLink`만 연결됨 판정에 쓴다.
- `legacy` 필드·역할 의존 힌트는 포함하지 않는다(research.md Decision 1, 2).

## 타입 참조

`src/types/gcal.ts`의 기존 정의를 그대로 사용한다(본 피처에서 타입 추가·수정 없음).

```ts
export type StatusResponse =
  | { linked: true; link: GCalLinkState; mySubscription?: ... | null }
  | { linked: false; scopeGranted: boolean };
```

## Compatibility

- 클라이언트(`GCalLinkPanel.tsx`)는 이미 두 분기(`linked:true`/`linked:false`)를 처리한다. 본 변경은 **특정 조건에서 `linked:true` → `linked:false`로 전환**될 뿐, 스키마 자체는 불변.
- MCP Python 클라이언트·기타 외부 소비자: 본 엔드포인트를 사용하지 않음(확인 완료 — `mcp/` 트리는 `/api/trips/[id]/gcal/*`을 직접 호출하지 않는다).
- 캐시: 응답은 여전히 요청자 세션 종속 — CDN 캐시 대상 아님(변경 없음).

## 관찰(Observability)

- Vercel 서버 로그에서 `GET /api/trips/:id/gcal/status`의 `linked:false` 비율 증가가 예상됨(폴백 제거 효과). 이는 **의도된 변화**로 SC-001 이후 관찰 대상이 아니다.
- SC-001 측정 기준은 `POST /api/v2/trips/*/calendar/{subscribe,sync}` 404 비율(Clarification Session 2026-04-22).

## 비-Contract 사항(후속)

- 본 피처는 v1 레거시 `/api/trips/[id]/gcal/link` / `/sync` / `/status`를 **제거하지 않는다**. contract 단계는 별도 릴리즈.
- `/api/v2/trips/[id]/calendar/*` 엔드포인트는 본 피처가 수정하지 않는다(spec 019 산출물).
