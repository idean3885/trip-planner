# Phase 1 Data Model — Google Calendar 연동

Phase 1 산출물. 신규 엔티티 2종(`GCalLink`, `GCalEventMapping`)과 기존 스키마(`User`, `Trip`, `Activity`, `Account`)와의 관계, 상태 전이, 제약 조건을 기술한다.

## 스키마 관계 (요약)

```text
User 1 ─┐
        ├── Account(provider='google', scope, access_token, refresh_token)   [기존, Auth.js]
        └── GCalLink ── Trip                                                 [신규, 본 피처]
                   └── GCalEventMapping ── Activity                          [신규, 본 피처]
```

- `GCalLink`는 "한 사용자가 한 여행을 자기 구글 캘린더에 연동한 상태"를 1건으로 표현한다.
- `GCalEventMapping`은 "한 활동이 한 구글 캘린더 이벤트에 대응되는 연결선"을 1건으로 표현한다.
- `Account`는 Auth.js가 이미 관리한다. 본 피처는 `scope`와 `access_token`/`refresh_token`을 **읽기만** 한다(신규 컬럼 추가 없음).

## 신규 엔티티 1 — GCalLink

| 필드 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | Int | PK, autoincrement | — |
| `userId` | String | FK → `User.id`(cuid), onDelete: Cascade | 연동을 실행한 본인 |
| `tripId` | Int | FK → `Trip.id`, onDelete: Cascade | 대상 여행 |
| `calendarId` | String | 필수 | Google Calendar ID. 전용 캘린더면 생성 시 받은 값, 기본 캘린더면 `"primary"` |
| `calendarType` | Enum(`DEDICATED`, `PRIMARY`) | 필수 | 사용자 선택 |
| `calendarName` | String? | — | 표시용 캐시. 전용일 때 `<여행명> (trip-planner)` |
| `lastSyncedAt` | DateTime? | — | 마지막으로 반영이 끝난 시각. 실패로 끝나면 이전 성공 시각 보존 |
| `lastError` | String? | — | 최근 에러 코드 요약(`REVOKED`, `RATE_LIMITED`, `NETWORK`, `UNKNOWN` 중 하나 또는 null) |
| `skippedCount` | Int | 기본 0 | 누적 건너뜀 수(사용자가 GCal에서 직접 수정한 이벤트) |
| `createdAt` / `updatedAt` | DateTime | auto | — |

**Unique**: `@@unique([userId, tripId])` — 한 사용자는 한 여행에 하나의 연동만 갖는다(동일 여행 중복 연동 방지).

**Index**: `@@index([tripId])` — 여행 삭제·삭제 감지 이벤트 훅에서 빠른 조회.

## 신규 엔티티 2 — GCalEventMapping

| 필드 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | Int | PK, autoincrement | — |
| `linkId` | Int | FK → `GCalLink.id`, onDelete: Cascade | 소속 연동 |
| `activityId` | Int | FK → `Activity.id`, onDelete: Cascade | 대응 활동 |
| `googleEventId` | String | 필수 | Google Calendar가 부여한 이벤트 식별자 |
| `syncedEtag` | String | 필수 | 마지막으로 "우리가 쓴" 이벤트 버전의 ETag (RFC 9110) |
| `lastSyncedAt` | DateTime | 필수 | 이 매핑의 마지막 성공 시각 |
| `createdAt` / `updatedAt` | DateTime | auto | — |

**Unique**: `@@unique([linkId, activityId])` — 한 연동 내에서 활동당 매핑 1개.

## 기존 엔티티 조회 경로 (변경 없음)

- `Account.scope` — `"https://www.googleapis.com/auth/calendar.events"`가 포함돼 있는지 검사. 없으면 scope 증분 동의 URL로 리디렉트.
- `Account.access_token` / `Account.refresh_token` / `Account.expires_at` — GCal REST 호출 시 사용. 만료 시 refresh token으로 재발급.
- `Activity` — 이벤트 변환 소스(title, startTime, endTime, startTimezone, endTimezone, location, memo, cost, currency, reservationStatus).
- `Trip.title` — 이벤트 제목 prefix.
- `TripMember` — 현재 사용자가 이 여행의 멤버인지 확인(기존 인증 가드 재사용).

## 상태 전이

### GCalLink 전이

```text
[없음]
  │ user requests /link
  ▼
[scope 없음] ── redirect to incremental consent ──┐
  │                                                │
  ▼                                                │
[scope 있음]  ← returns from callback ─────────────┘
  │ POST calendars (DEDICATED only) → calendarId
  │ 이벤트 일괄 생성 → mappings 저장
  ▼
[LINKED, lastSyncedAt set]
  │
  │ user requests /sync              user requests DELETE /link
  ▼                                   ▼
[re-sync: PATCH/POST/DELETE]       [unlink: DELETE events, drop mappings, drop link]
  │
  │ partial failure                   full success
  ▼                                   ▼
[LINKED, lastError set]            [없음]
```

### GCalEventMapping 전이

- **생성**: 새 활동 발견 → POST 이벤트 → 응답의 `id`/`etag` 저장.
- **갱신**: 활동 변경 + `syncedEtag` 일치 → PATCH(If-Match) → 응답의 새 `etag` 저장.
- **건너뜀**: PATCH 412(Precondition Failed) → `GCalLink.skippedCount++`. 매핑은 그대로 유지(다음 번에도 사용자 수정 상태를 존중).
- **삭제**: 대응 활동이 삭제됨 또는 unlink → DELETE(If-Match) → 매핑 제거.
- **삭제 건너뜀**: DELETE 412 → `skippedCount++`. 매핑은 끊고(연동 대상 아님), Google 이벤트는 사용자 소유로 남김.

## 마이그레이션

**migration-type: schema-only**

```sql
-- [migration-type: schema-only]
CREATE TABLE "gcal_links" (
  id             SERIAL PRIMARY KEY,
  "user_id"      TEXT   NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "trip_id"      INTEGER NOT NULL REFERENCES "trips"(id) ON DELETE CASCADE,
  "calendar_id"   TEXT NOT NULL,
  "calendar_type" TEXT NOT NULL CHECK ("calendar_type" IN ('DEDICATED','PRIMARY')),
  "calendar_name" TEXT,
  "last_synced_at" TIMESTAMPTZ(3),
  "last_error"    TEXT,
  "skipped_count" INTEGER NOT NULL DEFAULT 0,
  "created_at"    TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "gcal_links_user_id_trip_id_key" ON "gcal_links"("user_id","trip_id");
CREATE INDEX "gcal_links_trip_id_idx" ON "gcal_links"("trip_id");

CREATE TABLE "gcal_event_mappings" (
  id                SERIAL PRIMARY KEY,
  "link_id"         INTEGER NOT NULL REFERENCES "gcal_links"(id) ON DELETE CASCADE,
  "activity_id"     INTEGER NOT NULL REFERENCES "activities"(id) ON DELETE CASCADE,
  "google_event_id" TEXT NOT NULL,
  "synced_etag"     TEXT NOT NULL,
  "last_synced_at"  TIMESTAMPTZ(3) NOT NULL,
  "created_at"      TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ(3) NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "gcal_event_mappings_link_id_activity_id_key" ON "gcal_event_mappings"("link_id","activity_id");
```

**데이터 백필 없음**. 기존 여행에 대해 자동 연동되지 않고, 사용자가 각 여행에서 명시적으로 "올리기"를 눌렀을 때만 레코드가 생긴다. Expand-and-contract 불필요(새 테이블만 추가, 기존 스키마 불변).

## 검증 규칙

- **본인 경계**: 모든 쿼리에서 `GCalLink.userId = session.user.id`를 서버 측에서 강제. 다른 사용자의 링크를 조회·수정할 수 없도록 라우트 가드.
- **여행 멤버십**: `GCalLink` 생성 시 `TripMember(userId=session.user.id, tripId=?)` 존재 여부 확인. 없으면 403.
- **calendarId 안전성**: 클라이언트가 입력한 `calendarId`를 그대로 받지 않는다. `calendarType=PRIMARY`면 `"primary"`로 고정, `DEDICATED`면 서버가 `POST calendars` 응답으로 얻은 값만 저장.
- **ETag 무결성**: `syncedEtag`는 Google이 준 값을 그대로 저장. 길이·형식 검증은 생략(Google 스키마 신뢰).

## 권한 매트릭스 맥락

헌법 Permission Matrix에는 "GCal 연동"이 추가되지 않는다. 이는 **여행 조회 권한(OWNER/HOST/GUEST 모두 O)의 파생**이며, 각자 본인 자원(Google 계정·본인 캘린더)만 다루기 때문이다. 타 멤버 캘린더는 **코드 경로 자체가 접근하지 않는다**(R5 참조).
