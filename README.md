# Travel Planner

AI 기반 여행 플래너 — 숙소/항공편/관광지 검색(MCP) + 일정 웹앱(Next.js)

## 주요 기능

- **MCP 플러그인**: Claude Desktop/Code에서 숙소, 항공편, 관광지 검색 및 추천
- **캘린더 연동**: 여행 일정을 Apple 캘린더에 자동 등록 (iCloud 공유 지원)
- **일정 웹앱**: 마크다운 일정을 모바일 친화적 웹페이지로 공유
- **macOS 키체인**: API 키를 안전하게 관리

## 프로젝트 구조

```
trip-planner/
├── src/
│   ├── travel_mcp/          # MCP 서버 (Python, PyPI 배포)
│   │   ├── api_client.py    # RapidAPI 클라이언트 (키체인 지원)
│   │   └── server.py        # MCP 도구 8개
│   ├── app/                 # Next.js 웹앱 (App Router)
│   │   ├── page.tsx         # 메인: 여행 개요 + 일정 목차
│   │   └── day/[num]/       # 일별 상세 일정
│   └── lib/
│       └── trips.ts         # 마크다운 → HTML 변환
├── trips/                   # 여행 일정 데이터 (마크다운)
│   └── 2026-honeymoon-portugal-spain/
│       ├── overview.md
│       ├── itinerary.md
│       └── daily/           # 일별 상세 (day01~day14)
├── scripts/                 # 설치, 검증 스크립트
├── tests/                   # 단위 테스트 89개 + 통합 테스트
├── specs/                   # 설계 문서 (스펙, 플랜, ADR)
├── package.json             # Next.js 웹앱
└── pyproject.toml           # MCP 서버 (PyPI)
```

## 웹앱 (일정 공유)

trips/ 마크다운을 빌드 시점에 정적 페이지로 변환합니다.

```bash
npm install
npm run build
npm run start
```

http://localhost:3000 에서 확인. 마크다운 수정 후 재빌드하면 웹에 반영됩니다.

## MCP 플러그인 (검색)

### 설치 (맥북, 1줄)

```bash
curl -sSL https://raw.githubusercontent.com/idean3885/trip-planner/main/scripts/install.sh | bash
```

- macOS 키체인에 API 키 자동 저장
- Claude Desktop 자동 설정
- Apple 캘린더 MCP 자동 설치 (macOS 전용)
- GitHub Discussions 피드백 채널 자동 설정 (선택)
- Claude Desktop 재시작 후 바로 사용

### RapidAPI 키 발급

1. [RapidAPI - Booking.com](https://rapidapi.com/DataCrawler/api/booking-com15) 접속
2. 회원가입 후 **Basic 플랜 구독** ($8.99/월)
3. "X-RapidAPI-Key" 복사해두기

### Claude Code 등록

```bash
claude mcp add travel -s user -- ~/.trip-planner/.venv/bin/python -m travel_mcp.server
```

### 사용법

Claude Desktop 또는 Claude Code에서:

```
"바르셀로나 6월 16일~20일 4박 숙소 추천해줘"
"그라나다에서 할 수 있는 투어 검색해줘"
"포르투에서 리스본 가는 6월 10일 항공편 찾아줘"
```

### GitHub PAT 발급 (피드백 채널, 선택)

1. [GitHub Fine-grained PAT](https://github.com/settings/tokens?type=beta) 접속
2. Token name: `trip-planner`
3. Repository access → **Only select repositories** → `idean3885/trip-planner`
4. Permissions → **Discussions** → Read and write
5. Generate token 후 복사 (설치 스크립트에서 입력)

### MCP 도구 (11개)

| 카테고리 | 도구 | 설명 |
|---------|------|------|
| 숙소 | search_destinations | 도시/목적지 검색 |
| | get_hotels | 호텔 목록 (한화, 리뷰, 할인) |
| | get_hotel_details | 호텔 상세 (시설, 예약 링크) |
| 항공편 | search_flight_destinations | 공항/도시 검색 |
| | search_flights | 항공편 목록 (가격, 경유, 수하물) |
| 관광지 | search_attraction_locations | 관광지 위치 검색 |
| | search_attractions | 관광지 목록 (입장료, 리뷰) |
| | get_attraction_details | 관광지 상세 (주소, 포함 사항) |
| 피드백 | list_categories | 디스커션 카테고리 목록 |
| | create_feedback | 피드백 디스커션 생성 |
| | list_feedback | 최근 피드백 목록 조회 |

## 개발자용

```bash
# MCP 서버 테스트
pip install -e ".[dev]"
pytest tests/unit/ -v          # 단위 테스트 89개

# 웹앱 개발
npm install
npm run dev                    # http://localhost:3000

# PyPI 배포 (CI 자동)
pip install trip-planner-mcp
```

## 기술 스택

- **MCP 서버**: Python 3.14, FastMCP, httpx, macOS Keychain
- **웹앱**: Next.js 15, Tailwind CSS v3, remark (마크다운 파싱)
- **배포**: PyPI (MCP), AppPaaS (웹앱)
- **CI/CD**: GitHub Actions (auto-tag + pypi-publish)
