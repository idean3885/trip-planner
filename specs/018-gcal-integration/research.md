# Phase 0 Research — Google Calendar 연동

Phase 0 산출물. 본 문서의 각 항목은 "무엇을 결정했는가(Decision) / 왜 그렇게 골랐는가(Rationale) / 무엇을 거절했는가(Alternatives)"로 구성한다.

---

## R1. Auth.js v5에서 기존 로그인 세션을 유지한 채 scope를 추가 요청하는 방식

**Decision**: Auth.js provider 설정의 `authorization.params`를 기본 scope로 유지하고, **캘린더 권한이 추가로 필요한 시점**에는 Google OAuth 2.0 authorization URL을 **서버에서 직접 빌드**해 브라우저를 리디렉트한다. URL 파라미터에 `include_granted_scopes=true`와 `prompt=consent`를 포함하여 **기존 동의를 유지한 채 새 scope만 추가 확보**한다. 콜백은 기존 `/api/auth/callback/google`을 재사용하고, Auth.js가 새로 발급된 토큰을 `Account.access_token` / `Account.refresh_token` / `Account.scope` 필드에 갱신한다.

**Rationale**:
- Auth.js v5 GoogleProvider는 초기 scope를 provider 정의 시점에 지정하도록 설계되어 있고, 런타임에 `signIn('google', { scope })`로 override하는 공식 경로가 없다. 그러나 Google OAuth 2.0 표준은 `include_granted_scopes=true` 파라미터를 통해 **이미 동의된 scope를 유지하면서 추가 scope만 요청**하는 incremental authorization을 공식 지원한다.
- 서버에서 URL을 빌드하여 리디렉트하면 Auth.js의 기존 callback 처리(토큰 저장·세션 갱신)에 자연스럽게 합류한다. 별도 OAuth 상태머신을 만들 필요가 없다.
- 세션 쿠키를 폐기하지 않으므로 "로그인 → 동의 → 다시 로그인" 루프가 원천 차단된다(스펙 FR-002).

**Alternatives considered**:
- *Google SDK(`google-auth-library`)의 `OAuth2Client`를 직접 쓴다*: 구현 가능하지만 Auth.js와 이중 토큰 저장소가 생겨 refresh 경로가 갈라진다. 유지 비용 높음. 거절.
- *provider 초기 scope에 캘린더 권한까지 포함*: 일반 로그인 사용자까지 캘린더 권한을 묻는 불필요한 마찰 발생. 캘린더를 쓰지 않는 사용자에게도 "이 앱이 캘린더를 읽고 쓰려 합니다" 동의 화면을 노출. 거절.

---

## R2. Google Calendar API 호출 전략 — 공식 SDK 채택

**Decision**: **`@googleapis/calendar`**(Google Calendar v3 단일 API 패키지) + **`google-auth-library`**(OAuth2 토큰 관리)를 도입한다. 자체 `fetch` 구현은 기각한다.

- 호출 범위: 전용 캘린더 생성, 이벤트 CRUD, 토큰 갱신.
- SDK의 `calendar.events.insert/patch/delete` 메서드가 Google이 관리하는 타입과 에러 스키마를 그대로 제공한다.
- `OAuth2Client.setCredentials(...)` 로 Auth.js가 저장한 access/refresh token을 주입해 사용하며, 갱신 이벤트를 받아 Prisma `Account`에 동기화한다.

### 라이브러리 평가 (ADR-0002 준수)

| 패키지 | 버전 | 제공자 | 최근 릴리스 | 최초 등록 | 해결 문제 | 대안과의 비교 | 러닝커브 신호 |
|---|---|---|---|---|---|---|---|
| `@googleapis/calendar` | 14.2.0 | Google 공식 (googleapis/google-api-nodejs-client) | 2025-12-15 | 2021-03 | Calendar v3 이벤트·캘린더 REST 호출의 타입 안전 래퍼. 공식 OpenAPI 스키마 기반 타입 자동 생성 | `googleapis` 전체 메타(171.4.0)는 불필요한 수백 개 API까지 묶임 | TypeScript 지원. Google Calendar API 공식 문서가 그대로 레퍼런스. Stack Overflow·블로그 예제 다수 |
| `google-auth-library` | 10.6.2 | Google 공식 (googleapis/google-cloud-node-core) | 2026-03-16 | 2015-02 (10+ 년 유지) | access_token 자동 갱신, 동시성 제어, OAuth2 Client | Auth.js만으로 refresh는 가능하나, Google API 호출 시 **Authorization 헤더 서명·Retry-After 처리**가 필요해 직접 구현 시 race condition·edge case 리스크 | 공식 문서 + Google Cloud Node SDK 생태계 전반 참조. TS 타입 |

### Rationale

- **ADR-0002 라이브러리 우선 원칙**에 합당. 두 패키지 모두 정식 버전(>=1.0) · Google 공식 유지 · 최근 4~6개월 내 릴리스 · 10년 규모의 레퍼런스 누적.
- **러닝커브**: Google Calendar API 공식 문서가 그대로 SDK 레퍼런스로 연결. 자체 구현이면 `src/lib/gcal/client.ts`를 본인/AI만 해독해야 한다.
- **스키마 변화 자동 흡수**: Google이 Calendar API 필드를 늘리거나 에러 구조를 바꿔도 패키지 버전 올리면 끝난다. 자체 구현은 수동 추적.
- **토큰 갱신 동시성**: `google-auth-library`가 단일 refresh 약속(promise)을 관리해 동시 401 대응 시 race를 방지한다.
- **오류 분류**: SDK는 `GaxiosError`에 `code`/`response.status`를 일관되게 노출. 우리 도메인 오류로 매핑하는 레이어만 얇게 쌓으면 된다.

### Alternatives considered

- **자체 `fetch` 경량 REST 클라이언트 (초기 제안)**: 번들 경량화는 서버 전용 의존성이라 실효 이득 미미. 유지 부담이 1인 개발자에게 집중되고 미래 합류자 러닝커브가 커짐. 오류/타입/동시성을 모두 직접 관리해야 함. **기각.**
- **메타 패키지 `googleapis` 전체**: 171개 API 포함. Calendar만 쓰는 상황에서는 과투자. **기각.**
- **`google-auth-library` 없이 Auth.js 세션 토큰만으로 호출**: Auth.js는 토큰 저장소 역할은 하지만, 만료 갱신의 동시성 제어·Retry-After 같은 HTTP 레이어 세부는 다루지 않는다. SDK에 맡기는 편이 안전. **기각.**

### 오류 매핑

SDK가 `GaxiosError`로 표준화한 응답을 받아 도메인 오류로 매핑한다.

| HTTP | 의미 | 도메인 처리 |
|---|---|---|
| 401 Unauthorized | access_token 만료 | `google-auth-library`가 refresh → 1회 재시도 |
| 403 Forbidden | 권한 회수 | `lastError = REVOKED` 저장. UI에 재연결 CTA |
| 404 Not Found | 이벤트/캘린더 삭제됨 | 매핑 정리(cascade). 사용자에 경고 없음 |
| 409 / 412 Precondition Failed | ETag 불일치 (사용자 수정) | 덮어쓰지 않음. `skippedCount++` |
| 429 Too Many Requests | rate limit | `Retry-After` 존중. 최대 3회 |
| 5xx | 서버 오류 | 지수 백오프 최대 3회. 실패 시 `failed[]` |

### "Minimum Cost" 해석 주석

헌법 Principle II는 **금전·인프라 비용**(유료 서비스 도입 억제) 원칙이다. npm 의존성 비용은 이 원칙의 대상이 아니다. 본 주석은 ADR-0002를 참조해 재발을 막기 위함.

---

## R3. 사용자가 GCal에서 직접 수정한 이벤트 감지 방식 (ETag)

**Decision**: 이벤트를 생성·갱신하고 받은 응답의 `event.etag`를 `GCalEventMapping.syncedEtag`에 저장한다. 재반영(PATCH) 또는 해제(DELETE) 요청 시 `If-Match: <syncedEtag>` 헤더를 붙인다. 응답 412 Precondition Failed를 받으면 **사용자가 사이에 이벤트를 직접 수정했다는 신호**로 해석하고, 덮어쓰기·삭제를 포기한다. `GCalLink.skippedCount`를 증가시켜 UI에 "건너뛴 이벤트 N개"로 고지한다.

**Rationale**:
- ETag는 RFC 9110 표준의 엔터티 버전 식별자. Google Calendar API v3가 이벤트마다 공식 제공하며, 동시성 제어 용도로 권장된다.
- ETag 불일치 시 **조건부 쓰기가 거부되는 것이 서버 측에서 보장**되므로, 클라이언트 쪽에서 "수정했는지 추측"하는 heuristic보다 견고하다.
- 사용자의 GCal 직접 수정 내용을 보호하는 정책(스펙 Clarification 3)을 구현 비용 없이 지킬 수 있다.

**Alternatives considered**:
- *`event.updated` 타임스탬프 비교*: Google이 ETag를 공식 제공하는 상황에서 약한 수단. 시간 동기화 오차에 취약. 거절.
- *버전 필드를 사용자 측에서 관리*: Google이 이미 주는 신호(ETag)를 재발명. 거절.

---

## R4. 전용 캘린더 자동 생성 시 `calendarId` 회수·저장

**Decision**: `POST /calendar/v3/calendars` 요청 시 `{ summary: "<여행명> (trip-planner)", timeZone: "<여행 대표 타임존>" }`을 바디로 보낸다. 응답의 `id`가 새 캘린더의 식별자이며, 이를 `GCalLink.calendarId`에 저장한다. 이후 모든 이벤트 CRUD는 이 `calendarId`를 사용한다. 사용자가 "기본 캘린더 사용"을 선택한 경우엔 `calendarId = "primary"`(Google의 고유 별칭)로 저장한다.

**Rationale**:
- 전용 캘린더는 "여행 종료 후 일괄 숨김·삭제가 쉽다"는 스펙 Clarification 5의 UX를 그대로 충족.
- `"primary"`는 Google의 공식 별칭이며, 실제 캘린더 ID를 조회하지 않아도 된다.
- 캘린더명 접미사 `"(trip-planner)"`는 사용자가 자기 캘린더 목록에서 본 앱 산출물을 구분하기 쉽게 해 준다.

**Alternatives considered**:
- *캘린더명에 prefix `[Trip]`*: 정렬 시 끝에 모이는 한국어 이름보다, 가독성에서 접미사 `"(trip-planner)"`가 나음. 거절.
- *여러 여행을 하나의 trip-planner 캘린더에 묶어서 관리*: 사용자가 여행별로 on/off 하기 어려움. 거절.

**여행 대표 타임존**: 여행의 첫 번째 날의 타임존(Day.timezone, 없으면 "UTC"). #232/#325에서 정상화된 필드를 사용.

---

## R5. 공유 여행에서 토큰 사용 주체 강제 (본인 계정만)

**Decision**: 모든 GCal API 라우트는 **세션 사용자의 Account 레코드에서만** access_token을 조회한다. 구체적으로:

```ts
const session = await auth();
const account = await prisma.account.findFirst({
  where: { userId: session.user.id, provider: "google" }, // ★ 세션 userId로만
});
```

다른 `TripMember.userId`로 `Account`를 조회하는 코드를 금지한다. 이 규칙을 **lint 수준 또는 코드 리뷰 체크포인트**로 명시한다(예: `client.ts`의 공개 함수가 `userId`를 매개변수로 받되, 호출부에서 `session.user.id`가 아닌 값을 넘기면 테스트에서 즉시 탐지). 테스트 케이스 `tests/api/gcal-sync.test.ts`에 "세션 A로 호출해 B의 토큰이 사용되지 않음"을 명시적으로 포함한다.

**Rationale**:
- 스펙 FR-007("각자 본인의 GCal에만") 은 "정책"이 아니라 **구조적으로 보장되어야 할 불변식**이다. 인덱스 버그나 권한 오판에 의한 우회를 원천 차단한다.
- 사용자 메모리 `feedback_root_cause_over_patch`("땜방보다 근본 재설계")의 원칙과 일치.

**Alternatives considered**:
- *API 입력에 `targetUserId`를 받고 검증*: 검증 누락 시 타 사용자의 토큰을 쓸 위험. 거절.
- *서비스 계정(Domain-wide delegation)*: 기업용 Google Workspace에만 가능. 본 피처 범위 밖. 거절.

---

## R6. 부분 실패 UX (서버 응답 스키마 + 클라이언트 재시도)

**Decision**: 링크/싱크 엔드포인트는 다음 통합 응답 스키마를 사용한다.

```json
{
  "status": "ok" | "partial" | "failed",
  "summary": {
    "created": 3,
    "updated": 12,
    "deleted": 1,
    "skipped": 2,
    "failed": 1
  },
  "failed": [
    { "activityId": 42, "reason": "rate_limited" }
  ],
  "link": {
    "calendarId": "...",
    "calendarName": "...",
    "lastSyncedAt": "2026-04-20T12:34:56Z",
    "lastError": null
  }
}
```

UI(`GCalLinkPanel`)는:
- `status="ok"`: 토스트 "연결됨 · 마지막 반영 시각"
- `status="partial"`: 상세 패널에 "건너뜀 K / 실패 F (다시 시도)" 배지. "다시 시도"는 `failed[]`의 활동만 재반영.
- `status="failed"`: 전체 실패. 원인 표시 + 재시도 버튼.

**Rationale**:
- 단일 실패로 전체 작업을 중단하면 사용자가 여러 번 처음부터 다시 해야 한다. 부분 성공을 허용하면서 세부를 투명하게 보여 주면 사용자 기대가 낮아지지 않는다.
- `skipped`와 `failed`를 분리해 "내가 수정한 게 보호되었다" vs "네트워크·권한 문제로 실패했다"를 구분 가능하게 한다.

**Alternatives considered**:
- *All-or-nothing(트랜잭션 롤백)*: Google Calendar API는 멀티 엔드포인트 트랜잭션을 지원하지 않아 클라이언트 쪽 "보상 트랜잭션"이 필요. 복잡도 과다. 거절.
- *조용한 실패*: 사용자에게 상태를 숨기면 신뢰 잃음. 거절.

---

## 해결된 NEEDS CLARIFICATION

Phase 0 진입 시점의 `[NEEDS CLARIFICATION]` 없음 — 스펙의 Clarifications 섹션(1~5)이 선제적으로 봉합됨. 위 R1~R6은 **구현 전략 결정**을 다뤘으며, 스펙의 WHAT/WHY를 뒤집는 결정은 없다.
