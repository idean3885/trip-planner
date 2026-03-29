# Travel Planner MCP

여행 숙소, 항공편, 관광지를 검색하고 AI가 추천하는 Claude Desktop 플러그인

## 설치 (맥북, 1줄)

```bash
curl -sSL https://raw.githubusercontent.com/idean3885/travel-planner/main/scripts/install.sh | bash
```

- RapidAPI 키 입력 → 자동 설치 완료
- Claude Desktop 재시작 후 바로 사용

### RapidAPI 키 발급

1. [RapidAPI - Booking.com](https://rapidapi.com/DataCrawler/api/booking-com15) 접속
2. 회원가입 후 **Basic 플랜 구독** ($8.99/월)
3. "X-RapidAPI-Key" 복사해두기

## 사용법

Claude Desktop에서 자연어로 질문하기:

| 질문 예시 | 동작 |
|----------|------|
| "마드리드 6/11~12 숙소 추천해줘" | 숙소 검색 + AI 추천 |
| "바르셀로나 관광지 추천해줘" | 관광지 검색 + AI 추천 |
| "포르투에서 리스본 항공편 찾아줘" | 항공편 검색 |

## 제공 도구 (8개)

### 숙소 검색
- **search_destinations** — 도시/숙소 검색
- **get_hotels** — 호텔 목록 조회
- **get_hotel_details** — 호텔 상세 정보

### 항공편 검색
- **search_flight_destinations** — 공항/도시 검색
- **search_flights** — 항공편 검색

### 관광지 검색
- **search_attraction_locations** — 관광지 위치 검색
- **search_attractions** — 관광지 목록 (가격, 리뷰, 취소정책)
- **get_attraction_details** — 관광지 상세 정보

## 업데이트

```bash
curl -sSL https://raw.githubusercontent.com/idean3885/travel-planner/main/scripts/install.sh | bash
```

같은 명령어로 업데이트됩니다 (기존 설정 자동 유지).

## 삭제

Claude Desktop 설정에서 "travel" 항목을 제거하세요:

1. Claude Desktop > Settings
2. "travel" 또는 "hotels" 관련 항목 삭제
3. Claude Desktop 재시작

## 개발자용

- `scripts/setup.sh` — 개발 환경 설정
- `pytest tests/unit/ -v` — 단위 테스트 실행
- PyPI: `pip install travel-planner-mcp`
