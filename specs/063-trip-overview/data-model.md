# Data Model: 여행 종합정보

## 스키마 변경 — 없음

새 테이블·컬럼 없음. 기존 엔티티에서 읽어 집계만 한다.

## 읽기 파생 — `TripSummary` (표시 전용, 비영속)

한 여행의 표시용 집계. 저장하지 않고 조회 시점에 계산한다.

| 필드 | 출처 | 설명 |
|---|---|---|
| `period` | `Day` min/max date (derived) | 기간(시작~종료). 일정 0건이면 미정. |
| `dayCount` | `_count.days` | 일수 |
| `memberCount` | `_count.tripMembers` | 동행자 총원(주인·호스트·게스트) |
| `currencySummary` | `summarize(activities)` | 통화별 지출 합계(+사전/현장 소계) |
| `krw` | `convertToKrw(activities, rateMap)` | 원화 근사 총액(참고). 미확보분 제외+partial. |
| `description` | `Trip.description` | 설명(있을 때만) |

## 집계 경로

- **목록**: trip 다건 → `_count`로 일수·인원 일괄, 활동은 `day.tripId in [...]`로 일괄 조회 후 trip별 그룹핑, 환율은 `getRatesForPairs`로 배치(캐시 우선). N+1 회피.
- **상세**: 단일 trip → 기존 `tripSummary`/`tripKrw`(이미 산출) + `_count.tripMembers` 추가.
