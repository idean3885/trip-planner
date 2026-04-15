# Data Model: 일정 구조화

**Feature**: 006-structured-activity
**Date**: 2026-04-15

## 신규 엔티티

### Activity

하루(Day) 내 개별 활동. 관광, 식사, 이동, 숙소, 쇼핑, 기타로 분류.

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | auto-increment PK | Y | |
| dayId | FK → Day.id | Y | 소속 일자 |
| category | enum | Y | SIGHTSEEING, DINING, TRANSPORT, ACCOMMODATION, SHOPPING, OTHER |
| title | string | Y | 활동 제목 ("벨렘탑 관광", "호텔 체크인") |
| startTime | string? | N | "HH:mm" 형식, null = 종일/미지정 |
| endTime | string? | N | "HH:mm" 형식 |
| location | string? | N | 장소명 ("Pastéis de Belém") |
| memo | text? | N | 자유 메모 (마크다운 지원) |
| cost | decimal? | N | 예상 비용 (0 이상) |
| currency | string | Y | 통화 코드 (기본 "EUR") |
| reservationStatus | enum? | N | REQUIRED, RECOMMENDED, ON_SITE, NOT_NEEDED |
| sortOrder | int | Y | 수동 정렬 순서 (기본 0) |
| createdAt | timestamp | Y | 생성 시각 |
| updatedAt | timestamp | Y | 수정 시각 |

### ActivityCategory (enum)

| 값 | 한글 | 용도 |
|----|------|------|
| SIGHTSEEING | 관광 | 관광지, 투어, 박물관 |
| DINING | 식사 | 레스토랑, 카페, 바 |
| TRANSPORT | 이동 | 항공, 기차, 버스, 택시 |
| ACCOMMODATION | 숙소 | 호텔 체크인/아웃 |
| SHOPPING | 쇼핑 | 마트, 면세점, 기념품 |
| OTHER | 기타 | 자유시간, 세탁 등 |

### ReservationStatus (enum)

| 값 | 한글 | 설명 |
|----|------|------|
| REQUIRED | 사전 예약 필수 | 매진 위험 |
| RECOMMENDED | 사전 예약 권장 | 미리 하면 편리 |
| ON_SITE | 현장 구매 | 현장 구매 가능 |
| NOT_NEEDED | 불필요 | 예약 불필요 |

## 기존 엔티티 변경

### Day (변경 없음)

- `content` 필드 유지 (레거시 마크다운, 읽기 전용)
- `activities` 관계 추가 (1:N → Activity)
- content와 activities 공존: 활동이 있으면 구조화 뷰 우선

## 관계

```
Trip 1──N Day 1──N Activity
```

- Day 삭제 시 → Activity cascade 삭제
- Activity는 반드시 하나의 Day에 소속

## 인덱스

- Activity: (dayId, startTime) — 시간순 조회
- Activity: (dayId, sortOrder) — 수동 정렬 조회

## 정렬 규칙

1. startTime이 있는 활동: 시간순 오름차순
2. startTime이 null인 활동: sortOrder 순, 시간 있는 활동 뒤에 배치
