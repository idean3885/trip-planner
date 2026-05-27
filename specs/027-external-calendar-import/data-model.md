# Data Model: 외부 캘린더 import

**Branch**: `027-external-calendar-import` · **Date**: 2026-05-27 · **Spec**: [spec.md](./spec.md)

본 문서는 spec FR-001~016 + research.md 결정에 따른 Prisma 스키마 변경과 도메인 entity 관계를 정의한다. 마이그레이션은 schema-only 1건.

## Entity 요약

| Entity | 신규/변경 | 소유 도메인 | 역할 |
|--------|-----------|-------------|------|
| `ActivityDraft` | 신규 | 일정 편성 | 외부 이벤트로부터 만든 일정 초안 |
| `ImportRun` | 신규 | 일정 편성 | import 1회 실행의 결과 메타 |
| `Activity` | 변경 없음 | 일정 편성 | draft 승격 시 신규 row 생성 (기존 흐름 재사용) |
| `Trip` | 변경 없음 | 일정 편성 | `ActivityDraft`·`ImportRun`의 부모 |

## ActivityDraft

외부 이벤트에서 만들어진 일정의 초안. 정식 `Activity`로 승격되기 전까지 별도 테이블에 보관한다.

### Prisma 스키마(개념)

```prisma
model ActivityDraft {
  id                  Int      @id @default(autoincrement())
  tripId              String
  trip                Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  dayId               String?
  day                 Day?     @relation(fields: [dayId], references: [id], onDelete: SetNull)

  // 외부 출처 식별
  provider            CalendarProvider   // enum: GOOGLE | APPLE
  externalCalendarId  String
  externalEventId     String

  // 매핑 가능 필드 (외부 → 자동 채움)
  title               String
  startTime           DateTime
  endTime             DateTime
  isAllDay            Boolean  @default(false)
  locationText        String?
  description         String?

  // 매핑 불가 필드 (사용자 보강 대상)
  startTimezone       String?
  endTimezone         String?

  // 상태 추적
  status              ActivityDraftStatus @default(PENDING) // PENDING | PROMOTED | DELETED
  promotedToActivityId String? @unique
  promotedToActivity   Activity? @relation(fields: [promotedToActivityId], references: [id], onDelete: SetNull)

  // 메타
  importRunId         String
  importRun           ImportRun @relation(fields: [importRunId], references: [id], onDelete: Restrict)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  lastRefreshedAt     DateTime?  // "다시 가져오기" 시 갱신

  @@unique([provider, externalCalendarId, externalEventId])
  @@index([tripId, status])
}
```

### 필드 정의

- `provider`: enum. `GOOGLE` | `APPLE`. fetch 어댑터가 결정.
- `externalCalendarId`: 외부 캘린더 자체의 식별자(Google calendarId / Apple href).
- `externalEventId`: 외부 이벤트 식별자(Google event.id / Apple UID). research.md §2 근거.
- `title`, `startTime`, `endTime`, `isAllDay`, `locationText`, `description`: spec FR-003 매핑 가능 필드.
- `startTimezone`, `endTimezone`: 외부에 timezone이 명시되어 있으면 그대로, floating-time이면 `null`. 승격 시 사용자 입력 필요.
- `status`: draft 생명주기. `PENDING`(승격 전), `PROMOTED`(정식 Activity로 전환됨, 참조만 유지). `DELETED` enum 값은 후속 회차에서 소프트 삭제·복원 UX 도입 시 사용 예정 — 현재는 사용자 삭제 시 hard delete(DB 행 제거)로 처리한다.
- `promotedToActivityId`: 승격 시 만든 `Activity.id`와 1:1 연결(unique). 승격 후 draft를 삭제하지 않고 PROMOTED 상태로 두는 것이 멱등성·"다시 가져오기" 추적에 유리.

### 유니크 제약

`@@unique([provider, externalCalendarId, externalEventId])` — research.md §4 멱등성의 마지막 안전망. 동시 import race 시 DB 레벨에서 중복 차단.

### 인덱스

`@@index([tripId, status])` — trip 일정 화면에서 PENDING draft 조회용. 자주 쓰는 쿼리.

## ImportRun

import 1회 실행의 결과 요약. 사용자 응답·운영 진단에 쓰이며, 향후 dashboard·재시도 UX 도입 시 기반.

```prisma
model ImportRun {
  id                  Int      @id @default(autoincrement())
  tripId              String
  trip                Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  triggeredByUserId   String
  triggeredByUser     User     @relation(fields: [triggeredByUserId], references: [id])

  provider            CalendarProvider
  externalCalendarId  String

  importedCount       Int      @default(0)
  skippedCount        Int      @default(0)
  failedCount         Int      @default(0)
  failedTitles        String[] // 최대 3개 (privacy: title만)

  startedAt           DateTime @default(now())
  finishedAt          DateTime?

  drafts              ActivityDraft[]

  @@index([tripId, startedAt])
}
```

### 필드 정의

- `triggeredByUserId`: 어느 멤버가 import를 실행했는지. 권한 감사·재시도 추적.
- `importedCount` / `skippedCount` / `failedCount`: spec FR-014 요약 카운트.
- `failedTitles`: 실패 이벤트의 외부 제목 첫 3건. research.md §8 privacy 결정에 따라 description은 저장 안 함.
- `finishedAt`: import 종료 시각. null이면 진행 중(현재 마일스톤에선 동기 호출이지만 추후 async 분리 시 사용).

## ActivityDraftStatus / CalendarProvider enum

```prisma
enum ActivityDraftStatus {
  PENDING
  PROMOTED
  DELETED
}

enum CalendarProvider {
  GOOGLE
  APPLE
}
```

`CalendarProvider`는 기존 `GCalProvider` 같은 enum이 v2.11.0에 있으면 그것을 재사용. 없으면 신규 정의. **plan/implement 단계에서 기존 정의 존재 여부 확인 후 결정**(`spec.md` Out of Scope의 push 모델 변경 금지에 저촉되지 않는 한도 내).

## 관계도

```text
Trip ─┬─◀ ActivityDraft (1:N, cascade on Trip delete)
      ├─◀ ImportRun (1:N, cascade)
      └─◀ Activity (기존)

ImportRun ─◀ ActivityDraft (1:N, restrict — 진행 중인 run을 함부로 못 지움)

ActivityDraft ─▶ Activity (0..1 unique, promotion 시 연결, set null on Activity delete)
```

## 상태 전이

```text
[외부 이벤트 import]
        ↓
ActivityDraft(status=PENDING, promotedToActivityId=null)
        │
        ├─ 사용자 승격
        │     ↓
        │  Activity 신규 생성 + draft.status=PROMOTED + draft.promotedToActivityId=Activity.id
        │     ↓
        │  trip 캘린더 push (ADR 0003 기존 경로)
        │
        ├─ 사용자 "다시 가져오기"
        │     ↓
        │  draft.lastRefreshedAt 갱신 + 매핑 가능 필드 덮어쓰기 (매핑 불가 보존)
        │
        ├─ 사용자 draft 삭제
        │     ↓
        │  DB에서 draft 행 제거(hard delete). 외부 캘린더의 같은 이벤트는 다음 import에
        │  새 draft로 다시 들어올 수 있다(사용자 의도가 "지금 안 보고 싶다"인 경우 적합).
        │
        └─ trip 삭제
              ↓
            draft cascade 제거
```

## 검증 규칙

- `ActivityDraft.tripId`와 `ActivityDraft.dayId` 둘 다 있으면 day가 trip에 속해야 함(Prisma 무결성 + service 검증).
- `endTime >= startTime` — service 레벨 가드.
- `isAllDay=true`이면 startTime은 00:00, endTime은 day boundary로 service에서 normalize.
- 승격 시 필수 입력: `type`, `reservationStatus`. `hotelId` xor `attractionId` 중 0개 또는 1개. 모두 없으면 type만 가지고 승격(예: TRANSPORT). spec FR-009 검증.
- `failedTitles.length <= 3` — service에서 slice.

## Migration

마이그레이션 1건: `20260527XXXXXX_add_activity_draft/migration.sql`. 헤더 `[migration-type: schema-only]` 명시.

수행 항목:
- `CREATE TYPE ActivityDraftStatus`(존재 시 skip)
- `CREATE TYPE CalendarProvider`(존재 시 skip — v2.11.0에서 이미 있을 수 있음)
- `CREATE TABLE ActivityDraft`(컬럼·FK·인덱스·유니크 포함)
- `CREATE TABLE ImportRun`(컬럼·FK·인덱스)

데이터 백필 없음(신규 테이블). expand-and-contract 1단계 expand만, contract 불요.

## 도메인 경계 검증 (헌법 V)

- `ActivityDraft` 소유 도메인: **일정 편성**. 외부 캘린더는 "여행 탐색"의 데이터 원천 중 하나로 본다(`CalendarProvider` enum이 도메인 표면을 형성).
- 직접 참조: `Trip` → `ActivityDraft`(소유), `ActivityDraft` → `Activity`(승격 1:1). 모두 일정 편성 내부 또는 동일 도메인 within.
- 도메인 외부 참조 없음(외부 캘린더 데이터는 식별자만 보관, "여행 탐색" 모델로 normalize 안 함).
- 헌법 V Prohibited Cross-Domain Access 충돌 없음.
