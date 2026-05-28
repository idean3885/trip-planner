# Data Model — Spec 029

Phase 1 산출. plan.md의 Coverage Targets에서 derived 모델 부분.

## 변경 대상

### `Trip`

```prisma
model Trip {
  id          Int      @id @default(autoincrement())
  title       String
  ownerId     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // expand·migrate 단계: 명목 컬럼 유지 (현행)
  // contract 단계 (v3.0.0): DROP
  startDate   DateTime?  // 명목. 사용자 최초 입력. 일정 0건일 때만 표시·import에 사용
  endDate     DateTime?  // 명목. 동일

  days        Day[]
  members     TripMember[]
  // ... (기존 필드 유지)
}
```

**derived 계산**: `src/lib/trip-period.ts::getDerivedPeriod(tripId)` 가 `prisma.day.aggregate({ where: { tripId }, _min: { date }, _max: { date } })`로 매 응답 계산. 일정 0건이면 `{ startDate: null, endDate: null }`.

**상태 전이**:

| 상태 | 조건 | derived 결과 |
|------|------|------|
| 일정 미정 | `_count(days) === 0` | `(null, null)` — UI는 "일정 미정" 표시 |
| 일정 등록됨 | `_count(days) ≥ 1` | `(min(day.date), max(day.date))` |

### `Day`

변경 없음. derived 계산의 단위로 사용.

```prisma
model Day {
  id        Int      @id @default(autoincrement())
  tripId    Int
  date      DateTime
  // ...
  @@index([tripId, date])  // derived aggregate 쿼리 인덱스 — 이미 존재
}
```

### `Activity`

변경 없음.

### `UserPref` (또는 `User` JSON 컬럼)

본 spec에서는 **DB 모델 변경 없음**. 사용자 prefs는 client localStorage(`trip-planner:prefs:v1:`)에 저장 (research Topic 4 결정).

후속 spec에서 device 동기화 필요 시 모델 추가 검토.

## 무결성·검증 규칙

* derived 기간은 application 계층에서 매 응답 계산. DB에 stale value 보존 안 함.
* 명목 컬럼(`startDate`/`endDate`)은 일정 0건일 때만 의미. 일정 ≥ 1건이면 derived가 정본.
* 일정 추가/삭제는 transaction 안에서 처리. derived 계산은 read-only이라 동시성 충돌 없음.

## 도메인 경계 (Constitution V — Cross-Domain Integrity)

| 데이터 | 원천 도메인 | 본 spec 변경 |
|--------|-----------|-----------|
| Trip, Day, Activity | 일정 편성 | Trip의 startDate/endDate 출처를 명목 컬럼 → derived(Day aggregate)로 전환. 도메인 경계 변경 없음 |
| 외부 캘린더 import 기간 | 여행 활용 | derived 값 조회로 변경. 일정 편성 도메인의 정본 따름 (단방향 참조) |
| 공유 캘린더 push 기간 | 여행 활용 | 동일 |

## 마이그레이션 헤더 (메타태그 `[migration-type: schema-only]`)

* `prisma/migrations/<ts>-trip-period-expand/migration.sql` (v2.17.0) — 첫 줄에 `-- [migration-type: schema-only]` 주석. 컬럼 자체는 그대로 유지하므로 실제 SQL은 인덱스 보강이나 NULL 허용 등 부가 작업만.
* `prisma/migrations/<ts>-trip-period-contract/migration.sql` (v3.0.0) — `ALTER TABLE "Trip" DROP COLUMN "startDate"; ALTER TABLE "Trip" DROP COLUMN "endDate";`. 첫 줄에 `-- [migration-type: schema-only]`.

## 영향 범위 매핑

| 영향 영역 | 변경 |
|-----------|------|
| `computeDayNumber(day.date, trip.startDate)` | `trip.startDate` 인자를 `derivedStartDate`로 대체. 일정 0건이면 호출 안 함 |
| `GET /api/v2/trips` 응답 | `startDate`/`endDate` 필드 위치·타입 유지. 값 출처를 derived로 |
| `GET /api/v2/trips/[id]` 응답 | 동일 |
| 외부 캘린더 import 기간 | `runImport`의 trip 기간 조회를 derived로 |
| 공유 캘린더 push 기간 | 동일 |
| MCP `create_trip` / `update_trip` | startDate/endDate 파라미터 제거 (v3.0.0 breaking). 호출자는 첫 `create_activity` 또는 `create_day`로 derived 기간 부여 |
| 트립 목록 카드 | 일정 0건 트립은 "일정 미정" 표시. 그 외는 derived 기간 |
| 트립 상세 헤더 | derived 기간 표시. UI는 자동 갱신(optimistic + revalidate) |
