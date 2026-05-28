# Contract — Trip 목록 query (체크박스 prefs)

`GET /api/v2/trips` 목록 응답에 사용자가 속한 모든 여행의 메타데이터를 default로 반환합니다. 캘린더 사이드 체크박스에 노출할 모든 후보입니다.

## Query Parameters

| 이름 | 타입 | 기본 | 설명 |
|------|------|------|------|
| `view` | `'calendar' \| 'list'` | `'calendar'` | 응답에 포함할 필드 hint. UI 단계 분기. (선택) |
| `include_tripIds` | `string` (CSV) | (전체) | 체크박스 켜진 여행 ID 목록. 응답이 derived 기간·일정 dot 정보를 이 id 들에 한해 자세히 채움. 미지정 시 전체 |

체크박스 prefs 자체는 client localStorage에 보존(research Topic 4)이라 query parameter는 캐시 hint 수준입니다. server는 사용자가 속한 모든 여행을 반환합니다.

## 응답 예시 (캘린더 뷰 진입 시)

```json
{
  "trips": [
    {
      "id": 123,
      "title": "신혼여행",
      "startDate": "2026-06-07T00:00:00.000Z",
      "endDate": "2026-06-21T00:00:00.000Z",
      "memberRole": "OWNER",
      "color": "trip-color-1",
      "dayCount": 15
    },
    {
      "id": 456,
      "title": "동창회",
      "startDate": "2026-06-15T00:00:00.000Z",
      "endDate": "2026-06-15T00:00:00.000Z",
      "memberRole": "HOST",
      "color": "trip-color-2",
      "dayCount": 1
    }
  ]
}
```

* `color`: `src/lib/trip-palette.ts`가 부여한 디자인 토큰 키. CSS 변수 `var(--<color>)` 사용.
* `dayCount`: 일정 0건이면 0. 캘린더 그리드에 노출 안 함 (Edge case 정합).
* `memberRole`: 사용자가 그 여행에서 가진 역할. 일정 편집 가능 여부 표시용.

## RBAC

사용자가 속하지 않은(`TripMember`에 없는) 여행은 응답에 포함되지 않습니다. 변경 없음.
