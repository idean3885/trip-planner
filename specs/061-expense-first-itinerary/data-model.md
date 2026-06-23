# Data Model: 061-expense-first-itinerary

## `Activity` 변경

### 제거

- **`reservationStatus`** 컬럼 + **`ReservationStatus`** enum(REQUIRED/RECOMMENDED/ON_SITE/NOT_NEEDED/RESERVED) 삭제.
  - 예약 "여부"는 과한 입력 — 예약 정보는 제목·내용·시간으로 표현(사용자 결정).

### 추가

- **`paymentTiming`** : enum **`PaymentTiming { ADVANCE, ON_SITE }`**, NOT NULL, default `ON_SITE`.
  - `ADVANCE` = 사전 결제(여행 전 결제·예약), `ON_SITE` = 현장 결제.
  - 합산의 "이미 쓴 돈(현장) vs 계획된 돈(사전)" 구분 축.

### 유지

- `category`(ActivityCategory 6종), `title`, `memo`(=내용), `cost`/`currency`(=가격), `startTime`/`endTime`(부동 시간, 선택), `location`, `url`, `allDay`, `sortOrder`.

## 백필 규칙 (data-migration)

DROP 전 `reservationStatus` → `paymentTiming` 보정:

| reservationStatus | → paymentTiming |
|---|---|
| RESERVED, REQUIRED, RECOMMENDED | ADVANCE |
| ON_SITE, NOT_NEEDED | ON_SITE |
| NULL | ON_SITE |

## 마이그레이션 (1건, `[migration-type: data-migration]`)

순서(expand-and-contract):

1. **expand**: `PaymentTiming` enum 생성, `activities.payment_timing` 컬럼 추가(NOT NULL default 'ON_SITE').
2. **backfill**: 위 규칙으로 `payment_timing` UPDATE(기존 `reservation_status` 기준).
3. **contract**: `activities.reservation_status` 컬럼 DROP, `ReservationStatus` 타입 DROP.

- Production `neondb` / Preview·Dev `neondb_dev`(#318). `prisma migrate deploy`만.
- 비가역(DROP) 포함이나 1인 앱·백필 후 의미 보존이라 수용. 롤백은 역마이그레이션이 아닌 백업 의존(현 규모 수용).

## 집계(파생, 저장 안 함)

- **일별 금액** = 해당 Day 활동 `cost` 합(통화별).
- **여행 총액** = 전체 활동 `cost` 합(통화별).
- **사전/현장 소계** = `paymentTiming`별 `cost` 합(통화별).
- 통화 혼재 시 통화별 라인으로 표기(임의 환산 없음). cost 없으면 0.

## 영향 모델

- 다른 테이블 변경 없음. `Day`/`Trip`은 집계 대상(스키마 무변경).
