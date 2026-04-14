# MCP Tools Contract: trip-mcp (trip_mcp)

## Server Info

- **Name**: "trip" (FastMCP 서버명)
- **Transport**: STDIO
- **Package**: trip-planner-mcp 2.0.0

## Search Tools (기존 travel_mcp에서 이관, 변경 없음)

| Tool | Parameters | Source |
| ---- | ---------- | ------ |
| search_destinations | query: str | RapidAPI |
| get_hotels | destination_id, checkin_date, checkout_date, adults?, currency_code? | RapidAPI |
| get_hotel_details | hotel_id, checkin_date, checkout_date, adults?, currency_code? | RapidAPI |
| search_flights | from_id, to_id, depart_date, adults?, cabin_class? | RapidAPI |
| search_flight_destinations | query: str | RapidAPI |
| search_attraction_locations | query: str | RapidAPI |
| search_attractions | id: str, sortBy?, page? | RapidAPI |
| get_attraction_details | slug: str | RapidAPI |

## Planner Tools (신규, 웹 API 호출)

### list_trips() → str
사용자의 여행 목록을 조회한다.
- **API**: GET /api/trips
- **Auth**: PAT (Authorization: Bearer)
- **Returns**: 여행 제목, 기간, 멤버 수, 일자 수

### get_trip(trip_id: int) → str
여행 상세 정보와 전체 일자를 조회한다.
- **API**: GET /api/trips/{trip_id}
- **Auth**: PAT
- **Returns**: 여행 정보 + 일자별 제목/내용/날짜

### create_day(trip_id: int, date: str, title: str, content: str = "") → str
여행에 새 일자를 추가한다.
- **API**: POST /api/trips/{trip_id}/days
- **Auth**: PAT (HOST 이상)
- **Params**: date(YYYY-MM-DD), title, content(마크다운)
- **Returns**: 생성된 Day 정보

### update_day(trip_id: int, day_id: int, title: str = None, content: str = None) → str
일자의 제목이나 내용을 수정한다.
- **API**: PUT /api/trips/{trip_id}/days/{day_id}
- **Auth**: PAT (HOST 이상)
- **Returns**: 수정된 Day 정보

### delete_day(trip_id: int, day_id: int) → str
일자를 삭제한다.
- **API**: DELETE /api/trips/{trip_id}/days/{day_id}
- **Auth**: PAT (HOST 이상)
- **Returns**: 삭제 확인

### list_members(trip_id: int) → str
여행 멤버 목록을 조회한다.
- **API**: GET /api/trips/{trip_id}/members
- **Auth**: PAT
- **Returns**: 멤버 이름, 역할, 참여일

## Environment Variables

| Variable | Source | Purpose |
| -------- | ------ | ------- |
| RAPIDAPI_KEY | macOS Keychain (trip-planner/rapidapi-key) | 검색 API 인증 |
| RAPIDAPI_HOST | 상수: booking-com15.p.rapidapi.com | 검색 API 호스트 |
| TRIP_PLANNER_PAT | macOS Keychain (trip-planner/api-pat) | 웹 API 인증 |
| TRIP_PLANNER_URL | 기본값: https://trip.idean.me | 웹 API 베이스 URL |

## Error Handling

- 검색 도구 실패: RapidAPI 오류 메시지 반환 (기존 동작 유지)
- CRUD 도구 실패: HTTP 상태 코드 + 서버 오류 메시지 반환
- 인증 실패 (401): "인증이 만료되었습니다. 웹사이트에서 새 토큰을 생성하세요." 메시지
- 권한 부족 (403): "이 작업에 대한 권한이 없습니다 (HOST 이상 필요)" 메시지
