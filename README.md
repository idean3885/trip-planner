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

> 이 API 하나로 숙소(Hotels.com, Agoda 등), 항공편, 관광지를 모두 검색합니다.

## 설치 확인

Claude Desktop 재시작 후, 아래 3가지 테스트로 정상 동작을 확인하세요.

### 테스트 1: 숙소 검색

Claude Desktop에 입력:
```
바르셀로나 6월 16일~20일 4박 숙소 추천해줘
```

**정상 동작 확인:**
- 호텔 이름, 한화(₩) 가격, 리뷰 점수(/10)가 표시되는가
- 예약 링크가 포함되는가 (호텔 상세 조회 시)
- 최소 5개 이상 호텔이 나오는가

### 테스트 2: 관광지 검색

Claude Desktop에 입력:
```
바르셀로나에서 갈만한 관광지 검색해줘
```

**정상 동작 확인:**
- 관광지 이름, 입장료, 평점(/5), 리뷰 수가 표시되는가
- Sagrada Família 등 유명 관광지가 포함되는가
- 무료 취소 가능 여부가 표시되는가

### 테스트 3: 관광지 상세

테스트 2 결과에서 관심 있는 관광지를 골라 입력:
```
사그라다 파밀리아 입장권 상세 정보 알려줘
```

**정상 동작 확인:**
- 주소, 입장료, 취소 정책이 표시되는가
- 포함/미포함 사항이 나오는가
- 오디오 가이드 지원 언어에 Korean이 있는가

### 문제 발생 시

| 증상 | 원인 | 해결 |
|------|------|------|
| 도구 아이콘(망치)이 안 보임 | Claude Desktop 미재시작 | Claude Desktop 완전 종료 후 재실행 |
| "Error fetching" 메시지 | API 키 오류 | `~/.travel-planner/.env` 파일의 키 확인 |
| 검색 결과 없음 | 도시명 영문 필요 | "마드리드" 대신 "Madrid"로 재시도 |

## 사용법

설치 확인이 끝나면 자유롭게 사용하세요:

```
"리스본 6/7~9 숙소 중 리뷰 9점 이상만 추천해줘"
"그라나다에서 할 수 있는 투어 중 무료 취소 가능한 것만 보여줘"
"포르투에서 리스본 가는 6월 10일 항공편 찾아줘"
"바르셀로나 가우디 관련 관광지만 모아서 정리해줘"
```

## 제공 도구 (8개)

### 숙소 검색
- **search_destinations** — 도시/목적지 검색
- **get_hotels** — 호텔 목록 (한화 가격, 리뷰, 할인율)
- **get_hotel_details** — 호텔 상세 (시설, 체크인/아웃, 예약 링크)

### 항공편 검색
- **search_flight_destinations** — 공항/도시 검색
- **search_flights** — 항공편 목록 (가격, 경유, 수하물)

### 관광지 검색
- **search_attraction_locations** — 관광지 위치 검색
- **search_attractions** — 관광지 목록 (입장료, 리뷰, 취소정책)
- **get_attraction_details** — 관광지 상세 (설명, 주소, 포함/미포함, 오디오 언어)

## 업데이트

```bash
curl -sSL https://raw.githubusercontent.com/idean3885/travel-planner/main/scripts/install.sh | bash
```

설치와 같은 명령어입니다. 실행하면:
- 최신 코드 자동 다운로드
- API 키는 기존 설정 유지 (재입력 불필요)
- Claude Desktop 재시작 후 새 기능 사용 가능

## 삭제

```bash
rm -rf ~/.travel-planner
```

Claude Desktop 설정에서 "travel" 항목도 제거하세요:
1. `~/Library/Application Support/Claude/claude_desktop_config.json` 열기
2. `"travel": { ... }` 블록 삭제
3. Claude Desktop 재시작

## 개발자용

- `scripts/setup.sh` — 개발 환경 설정
- `pytest tests/unit/ -v` — 단위 테스트 (89개)
- PyPI: `pip install travel-planner-mcp`
- [ADR-001: 아키텍처 결정](specs/001-ax-travel-planning/adr/001-fe-only-stateless-architecture.md)
