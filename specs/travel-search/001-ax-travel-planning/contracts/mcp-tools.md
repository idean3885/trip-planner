# 검색 도구 인터페이스 계약

**Branch**: `001-ax-travel-planning` | **Date**: 2026-03-29 (갱신)
**MCP 서버**: `travel` (FastMCP) | **파일**: `mcp-servers/hotels_mcp_server/hotels_mcp/hotels_server.py`
**CLI 스크립트**: `scripts/` | **공용 클라이언트**: `mcp-servers/hotels_mcp_server/hotels_mcp/api_client.py`

> **변경 이력**: MCP 전용 → MCP(기존) + CLI(신규) 하이브리드로 전환. [ADR-001](../adr/001-fe-only-stateless-architecture.md) 참조.

---

## MCP 도구 (구현 완료, 유지)

### search_destinations

목적지(도시) ID를 검색한다. 호텔 검색의 선행 단계.

```
Input:
  query: str          # 도시명 (예: "Lisbon", "Madrid")

Output: str           # 포맷된 텍스트
  - Name, Type, City ID, Region, Country, Coordinates
```

### get_hotels

특정 목적지의 호텔 목록을 검색한다.

```
Input:
  destination_id: str  # search_destinations에서 얻은 city_ufi
  checkin_date: str    # YYYY-MM-DD
  checkout_date: str   # YYYY-MM-DD
  adults: int = 2
  currency_code: str = "KRW"  # 통화 코드 (기본 한화)

Output: str            # 최대 10개 호텔, 포맷된 텍스트
  - Name, Hotel ID, Location, Rating, Reviews, Room, Price(KRW), Discount, Coordinates, Stars, Photo, Check-in/out

Note: 결과 표시 후 관심 호텔에 대해 get_hotel_details를 호출하여 예약 링크를 제공해야 함
```

### get_hotel_details

특정 호텔의 상세 정보 + 다중 플랫폼 예약 링크를 조회한다.

```
Input:
  hotel_id: str        # get_hotels 결과의 Hotel ID
  checkin_date: str    # YYYY-MM-DD
  checkout_date: str   # YYYY-MM-DD
  adults: int = 2
  currency_code: str = "KRW"  # 통화 코드 (기본 한화)

Output: str            # 포맷된 텍스트
  - Name, Address, City, Rating, Stars, Check-in/out, Facilities, Price/night(KRW)
  - 예약 링크: Booking.com(직접), Agoda(검색), Hotels.com(검색), Google Hotels(검색)
  - Description
```

### search_flight_destinations

항공편 검색용 공항/도시 ID를 검색한다.

```
Input:
  query: str           # 도시명 또는 공항명 (예: "Porto", "Madrid")

Output: str            # 최대 10개 결과, 포맷된 텍스트
  - Name, ID (예: "OPO.AIRPORT"), Type, City, Country, IATA
```

### search_flights

두 지점 간 항공편을 검색한다.

```
Input:
  from_id: str         # 출발 공항 ID (예: "OPO.AIRPORT")
  to_id: str           # 도착 공항 ID (예: "MAD.AIRPORT")
  depart_date: str     # YYYY-MM-DD
  adults: int = 2
  cabin_class: str = "ECONOMY"  # ECONOMY | PREMIUM_ECONOMY | BUSINESS | FIRST

Output: str            # 최대 10개 항공편, 포맷된 텍스트
  - Price, Route (출발→도착), Airline, Duration, Stops, Baggage
```

---

## CLI 스크립트 (구현 예정 — 엔드포인트 검증 필요)

> MCP가 아닌 CLI 스크립트로 구현. `api_client.py`의 `make_rapidapi_request()`를 재사용.

### search_attraction_locations

관광지 검색용 위치 ID를 검색한다.

```
CLI: python scripts/search_attraction_locations.py --query "Barcelona"

Input:
  --query: str         # 도시명 (예: "Barcelona", "Granada")

Output: stdout         # 위치 목록, 포맷된 텍스트
  - Name, ID, Type, Country

예상 API: GET /api/v1/attraction/searchLocation
  params: { query }
```

> **검증 필요**: 엔드포인트 경로와 응답 구조를 실제 API 호출로 확인해야 함.

### search_attractions

특정 위치의 관광지/투어 목록을 검색한다.

```
CLI: python scripts/search_attractions.py --location-id "eyJ..." --date "2026-06-18"

Input:
  --location-id: str   # search_attraction_locations에서 얻은 ID
  --date: str          # YYYY-MM-DD (방문 예정일)

Output: stdout         # 관광지 목록, 포맷된 텍스트
  - Name, Price, Duration, Rating, Reviews, Booking Required, Category

예상 API: GET /api/v1/attraction/searchAttractions
  params: { id, date }
```

> **검증 필요**: 파라미터명(id vs location_id vs dest_id)과 필수/선택 파라미터 확인.

### get_attraction_details

특정 관광지/투어의 상세 정보를 조회한다.

```
CLI: python scripts/get_attraction_details.py --attraction-id "..." --date "2026-06-18"

Input:
  --attraction-id: str # search_attractions에서 얻은 ID
  --date: str          # YYYY-MM-DD

Output: stdout         # 포맷된 텍스트
  - Name, Description, Price, Duration, Included/Excluded, Meeting Point, Cancellation Policy, Photos

예상 API: GET /api/v1/attraction/getAttractionDetails
  params: { id, date }
```

> **검증 필요**: 응답 구조에 따라 출력 포맷 조정.

---

## 공통 사항

### 에러 처리
모든 도구는 API 호출 실패 시 `"Error {action}: {error message}"` 형태의 문자열을 반환한다.

### API 설정
```
RAPIDAPI_KEY: 환경변수 (.env)
RAPIDAPI_HOST: "booking-com15.p.rapidapi.com"
Timeout: 30초
```

### 호출 패턴

**MCP 도구** (Hotels, Flights):
1. Claude Desktop/Code가 MCP 프로토콜로 호출
2. `make_rapidapi_request(endpoint, params)` 실행
3. 응답 파싱 및 포맷팅 → 포맷된 문자열 반환

**CLI 스크립트** (Attractions):
1. Bash에서 `python scripts/*.py --arg value` 실행
2. `api_client.py`의 `make_rapidapi_request()` 재사용
3. 응답 파싱 및 포맷팅 → stdout 출력

### 도구 간 의존관계
```
[MCP] search_destinations → get_hotels → get_hotel_details
[MCP] search_flight_destinations → search_flights
[CLI] search_attraction_locations → search_attractions → get_attraction_details
```

각 체인의 첫 번째 도구로 ID를 획득한 뒤, 후속 도구에 전달하는 구조.
