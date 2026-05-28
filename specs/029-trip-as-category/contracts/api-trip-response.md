# Contract — Trip 응답 (derived 기간)

`GET /api/v2/trips` (목록) 및 `GET /api/v2/trips/[id]` (단건) 응답에서 `startDate`·`endDate`의 값 출처를 명목 컬럼에서 derived(Day aggregate)로 전환합니다. 응답 스키마(필드 위치·타입)는 호환됩니다.

## 변경 시점

| Version | 동작 |
|---------|------|
| v2.16.x 이하 (현행) | 명목 컬럼 그대로 반환 |
| v2.17.0 (expand) | 명목 컬럼 그대로 반환 — derived 헬퍼만 도입, 응답은 호환 |
| v2.18.0 (migrate) | derived 값 반환. 일정 0건이면 명목 fallback (있으면) 또는 null |
| v3.0.0 (contract) | 일정 0건이면 항상 null. 명목 컬럼 자체가 DB에서 제거됨 |

## 응답 스키마 (v3.0.0 기준)

```json
{
  "id": 123,
  "title": "신혼여행",
  "startDate": "2026-06-07T00:00:00.000Z",
  "endDate": "2026-06-21T00:00:00.000Z",
  "ownerId": "user_abc",
  "createdAt": "2026-04-01T10:00:00.000Z",
  "updatedAt": "2026-05-28T03:00:00.000Z",
  "memberRole": "OWNER",
  "_count": { "days": 15 }
}
```

* `startDate`, `endDate`: derived 값. 일정 0건이면 `null`.
* 필드 위치·타입(`string|null` ISO-8601)·기타 모든 필드 호환.

## 마이그레이션 노트

* OpenAPI 스키마 정의도 함께 갱신해 client SDK·LLM의 응답 해석이 정합되게 합니다.
* 클라이언트는 응답에 `startDate === null`이 들어올 수 있음을 기존부터 가정해야 합니다(현행도 일부 trip에 null 가능). UI는 "일정 미정" 표시.
