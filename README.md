# 우리의 여행 ✈️

AI 에이전트가 숙소, 항공편, 관광지를 검색하고 일정을 관리해주는 여행 플래너입니다.

**[trip.idean.me](https://trip.idean.me)** 에서 바로 사용할 수 있습니다.

## 이렇게 쓰세요

### 1. 웹에서 일정 관리

[trip.idean.me](https://trip.idean.me)에 접속하여 Google 계정으로 로그인하면 바로 사용 가능합니다.

- 여행 생성 → 날짜별 일정 추가 → 활동(관광/식사/이동/숙소) 등록
- 동행자 초대 — 링크 공유로 함께 일정 확인
- 모바일 최적화 — 여행 중 스마트폰으로 일정 확인

### 2. AI 에이전트로 검색 + 자동 일정 생성

[Claude Desktop](https://claude.ai/download) 또는 [Claude Code](https://claude.ai/claude-code)에서 AI가 대신 검색하고 일정을 만들어줍니다.

**설치 (맥북, 1줄)**:
```bash
curl -sSL https://raw.githubusercontent.com/idean3885/trip-planner/main/scripts/install.sh | bash
```
설치 중 브라우저가 열리면 Google 로그인만 하세요. 토큰이 자동 저장됩니다.

**사용 예시** — Claude에게 말하듯 입력하면 됩니다:
```
"바르셀로나 6월 16일~20일 4박 숙소 추천해줘"
"포르투에서 리스본 가는 6월 10일 항공편 찾아줘"
"내 여행 목록 보여줘"
"3일차에 벨렘탑 관광 추가해줘 (09:00~11:00)"
```

AI가 할 수 있는 것 (20개 도구):

| 할 수 있는 것 | 예시 |
|--------------|------|
| 숙소 검색 | 도시, 날짜, 인원 기준 호텔 추천 (가격/리뷰/할인) |
| 항공편 검색 | 출발/도착 도시, 날짜 기준 항공편 비교 |
| 관광지 검색 | 도시 기반 관광지 목록 (입장료/리뷰/예약 링크) |
| 일정 관리 | 여행 생성, 일자 추가, 활동 등록/수정/삭제/순서 변경 |
| 마크다운 변환 | 기존 텍스트 일정을 구조화 활동으로 변환 |

## 링크

| | |
|---|---|
| 웹앱 | [trip.idean.me](https://trip.idean.me) |
| API 문서 | [trip.idean.me/docs](https://trip.idean.me/docs) |
| 개발 문서 | [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) |
| 변경 이력 | [CHANGELOG.md](CHANGELOG.md) |
