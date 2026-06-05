# Contract: Activity url 입출력 (058)

신규 엔드포인트 없음. 기존 활동 생성/수정/조회 표현에 `url`을 더한다.

## Web API (Next.js route)

대상: `POST /api/trips/{id}/days/{dayId}/activities`, `PATCH .../activities/{activityId}`

요청 바디(부분):
```jsonc
{
  "title": "마드리드-바르셀로나 기차",
  "memo": "좌석 16A/16B",          // 기존, 불변
  "url": "https://drive.google.com/file/d/…/view"  // 신규, 선택
}
```
- `url`: 선택. 문자열. 빈 문자열은 서버에서 `null`로 정규화.

응답(부분): 활동 객체에 `"url": string | null` 포함.

## MCP (trip_mcp/planner.py)

- `create_activity` / `update_activity`: 선택 인자 `url`(없으면 변경 안 함/생성 시 null).
- 활동 조회 표현: `url` 필드 포함.

## OpenAPI (src/lib/openapi.ts)

activity 스키마 properties에 추가:
```jsonc
"url": { "type": "string", "nullable": true, "description": "예약·티켓·문서 링크(선택)" }
```

## 표시 계약(UI)

- 활동 카드·상세: `url`이 truthy일 때만 클릭 가능한 링크. falsy면 미표시.
- 긴 URL은 줄바꿈으로 가로 넘침 방지(`break-words`/`break-all`).
