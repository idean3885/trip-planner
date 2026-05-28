# Contract — MCP `create_trip` / `update_trip` (v3.0.0 breaking)

v3.0.0 contract 단계에서 MCP `create_trip` / `update_trip` 시그니처에서 `startDate` / `endDate` 파라미터를 **제거**합니다. Breaking change.

## v2.x 시그니처 (이전)

```python
@tool
def create_trip(
    title: str,
    startDate: str,  # ISO-8601 YYYY-MM-DD
    endDate: str,    # ISO-8601 YYYY-MM-DD
    ownerId: str | None = None,
    ...
) -> Trip: ...

@tool
def update_trip(
    tripId: int,
    title: str | None = None,
    startDate: str | None = None,
    endDate: str | None = None,
    ...
) -> Trip: ...
```

## v3.0.0 시그니처 (변경 후)

```python
@tool
def create_trip(
    title: str,
    ownerId: str | None = None,
    ...
) -> Trip: ...
# startDate, endDate 파라미터 제거

@tool
def update_trip(
    tripId: int,
    title: str | None = None,
    ...
) -> Trip: ...
# startDate, endDate 파라미터 제거
```

기간을 부여하려면 `create_day` 또는 `create_activity`를 호출해 일정을 등록합니다. derived 기간이 자동 부여됩니다.

## 사용자 영향

협력자가 spec 030(MCP 자동 부트스트랩)의 업데이트 흐름으로 v3.0.0으로 갱신하면, AI client가 호환 안 되는 호출(예: `create_trip(startDate=...)`) 시도 시:

* MCP 서버: `Unknown parameter: startDate` 에러 반환
* AI client: 에러 응답을 사용자에게 자연어로 안내 + 대안(`create_day` 후 호출) 제안

spec 030의 FR-008("MAJOR breaking 변경 시 변경 사항 요약 안내")과 정합합니다.

## 코드 영향

* `mcp/trip_mcp/tools/create_trip.py` — `startDate`/`endDate` 파라미터 제거. `start_date` / `end_date` 본문 처리 코드 삭제
* `mcp/trip_mcp/tools/update_trip.py` — 동일
* MCP OpenAPI/JSON schema descriptor 자동 갱신 (FastMCP 자동 생성)
* CHANGELOG에 breaking 강조 표기

## 비변경

* `create_day` / `create_activity` / `delete_activity` 등 다른 MCP 도구 시그니처는 변경 없음
* OpenAPI `Trip` 응답 스키마(웹 API)는 호환(필드 위치·타입 유지, 값 출처만 derived로) — `contracts/api-trip-response.md` 참조
