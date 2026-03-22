# Data Model: AX 기반 여행 플래닝 + 모바일 딜리버리

**Branch**: `001-ax-travel-planning` | **Date**: 2026-03-22
**Input**: [spec.md](spec.md), [plan.md](plan.md)

---

## 개요

v1의 데이터는 **마크다운 파일**로 관리된다. 별도 데이터베이스나 JSON 스키마 없이, CLAUDE.md에 정의된 `trips/` 디렉토리 구조가 곧 데이터 모델이다. 아래는 각 엔티티가 어떤 파일에 어떤 형태로 저장되는지 정의한다.

---

## 엔티티 정의

### Trip (여행)

**저장 위치**: `trips/{year}-{trip-name}/overview.md`

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| name | string | 여행 이름 | 포르투갈&스페인 허니문 |
| period | date range | 여행 기간 | 2026-06-07 ~ 2026-06-21 |
| cities | list[string] | 방문 도시 목록 | 리스본, 포르투, 마드리드, 그라나다, 바르셀로나 |
| travelers | int | 여행 인원 | 2 |
| route | string | 이동 루트 | 리스본 → 포르투 → 마드리드 → 그라나다 → 바르셀로나 |
| flights | list | 항공편 정보 | 인천→리스본, 바르셀로나→인천 |
| weather | text | 날씨 정보 | 6월 평균 20~30도, 건조 |

### TravelItem (여행 요소)

**저장 위치**: 영역별 파일에 분산

| 영역 | 파일 | 주요 필드 |
|------|------|-----------|
| 숙소 | `accommodations.md` | 이름, 도시, 날짜, 가격, 리뷰점수, 예약상태, 링크 |
| 항공편 | `transport.md` | 구간, 항공사, 시간, 가격, 예약상태 |
| 도시 간 이동 | `transport.md` | 구간, 수단(기차/버스/항공), 소요시간, 가격, 예약상태 |
| 관광지 | `daily/dayNN-*.md` | 이름, 도시, 소요시간, 가격, 예약필요여부 |
| 식당 | `daily/dayNN-*.md` | 이름, 메뉴, 가격대, 위치, 예약필요여부 |

### TravelItem 공통 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| name | string | 항목 이름 |
| city | string | 소속 도시 |
| price | string | 가격 (통화 포함) |
| review_score | float | 리뷰 점수 (해당 시) |
| booking_status | enum | 예약 상태 |
| link | url | 예약/상세 링크 |

### DailySchedule (일별 일정)

**저장 위치**: `daily/dayNN-MMDD-{city}.md`

| 섹션 | 내용 | FR 매핑 |
|------|------|---------|
| 오늘의 요약 | 도시, 숙소, 이동, 예상 경비 | FR-005 |
| 숙소 | 체크인/아웃, 가격, 상태 | FR-001, FR-006 |
| 이동 | 도시 간 이동 수단, 시간, 비용, 예약 여부 | FR-001 |
| 일정 | 시간대별 일정 + 예약 필요 여부 | FR-004 |
| 투어/관광 상세 | 예약처, 비용, 소요시간 | FR-002 |
| 식사 추천 | 장소, 메뉴, 가격대, 예약 필요 여부 | FR-003 |
| 메모 | 팁, 주의사항 | — |

---

## 예약 상태 (Booking Status)

CLAUDE.md에 정의된 상태값을 그대로 사용:

| 상태 | 의미 | 마크다운 표기 |
|------|------|-------------|
| `사전 예약 필수` | 매진 위험, 반드시 미리 | 🔴 사전 예약 필수 |
| `사전 예약 권장` | 미리 하면 편리 | 🟡 사전 예약 권장 |
| `현장 구매` | 현장에서 구매 가능 | 🟢 현장 구매 |
| `불필요` | 예약 불필요 | ⚪ 불필요 |
| `예약 완료` | 이미 예약됨 | ✅ 예약 완료 |

---

## 파일 간 관계

```
overview.md (Trip)
  ├── accommodations.md (TravelItem: 숙소)
  ├── transport.md (TravelItem: 항공편, 도시 간 이동)
  ├── budget.md (예산·실지출 추적)
  ├── itinerary.md (전체 일정 요약 + 일별 목차)
  └── daily/
      └── dayNN-MMDD-{city}.md (DailySchedule)
          ├── 숙소 참조 → accommodations.md
          ├── 이동 참조 → transport.md
          ├── 관광 (TravelItem: 인라인)
          └── 식사 (TravelItem: 인라인)
```

---

## MCP 도구 응답 → 마크다운 매핑

MCP 도구가 반환하는 데이터가 마크다운의 어느 필드에 매핑되는지 정의한다.

### Hotels API → accommodations.md

| API 필드 | 마크다운 필드 |
|----------|-------------|
| `property.name` | 이름 |
| `property.wishlistName` | 위치 |
| `property.reviewScore` | 리뷰 점수 |
| `property.reviewCount` | 리뷰 수 |
| `priceBreakdown.grossPrice.value` | 가격 |
| `property.checkin/checkout` | 체크인/아웃 시간 |
| `property.propertyClass` | 성급 |

### Flights API → transport.md

| API 필드 | 마크다운 필드 |
|----------|-------------|
| `segments[].departureAirport.code` | 출발 공항 |
| `segments[].arrivalAirport.code` | 도착 공항 |
| `segments[].departureTime` | 출발 시간 |
| `segments[].arrivalTime` | 도착 시간 |
| `legs[].carriersData[].name` | 항공사 |
| `priceBreakdown.total.units` | 가격 |
| `segments[].totalTime` | 소요시간 |

### Attractions API → daily/dayNN-*.md (검증 후 확정)

| 예상 API 필드 | 마크다운 필드 |
|--------------|-------------|
| `name` | 관광지 이름 |
| `price` | 입장료 |
| `duration` | 소요시간 |
| `rating` | 리뷰 점수 |
| `booking_required` | 예약 필요 여부 |

> Attractions API 응답 구조는 구현 시 실제 호출로 확인 후 매핑 확정.

---

## 기존 예약 데이터 처리 (FR-006)

Claude가 일정을 생성할 때:
1. 기존 `trips/` 디렉토리의 마크다운 파일을 먼저 읽음
2. `예약 완료` 상태인 항목은 그대로 유지
3. 미확정 부분만 MCP 도구 / 웹 검색으로 새로 채움
4. 충돌 시 기존 예약 데이터 우선 (Edge Case 정의)
