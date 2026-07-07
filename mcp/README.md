# trip MCP 서버

"우리의 여행"([trip.idean.me](https://trip.idean.me))을 **AI 에이전트로 조작**하는 MCP(Model Context Protocol) 서버입니다. Claude 등에게 자연어로 말하면 여행·일자·활동을 조회·생성·수정하고, 숙소·항공·관광지를 검색해 일정에 넣어 줍니다.

> 예) *"포르투 6월 10일 리스본행 항공편 찾아줘"*, *"3일차 벨렘탑 09:00~11:00 추가해줘"*

MCP 서버는 DB에 직접 붙지 않고 웹과 동일한 REST API(`/api/v2`)의 클라이언트로 동작합니다. 즉 웹에서 보는 데이터와 MCP가 다루는 데이터가 같은 정본입니다.

## 설치 (맥북 한 줄)

```bash
curl -sSL https://raw.githubusercontent.com/idean3885/trip-planner/main/scripts/install.sh | bash
```

이 한 줄이 다음을 자동으로 처리합니다.

1. Python 가상환경에 서버를 설치합니다.
2. 브라우저가 열리면 **Google 로그인만** 하면 됩니다 — 토큰이 OS 키체인에 자동 저장됩니다(따로 복사·붙여넣기 없음).
3. Claude Desktop 설정(`claude_desktop_config.json`)에 `trip` 서버를 등록합니다.

설치 후 Claude Desktop을 다시 시작하면 바로 자연어로 요청할 수 있습니다.

## 인증

어느 경로든 최종 자격증명은 단기 만료 토큰이며, 차이는 **발급 방법**입니다.

- **브라우저 OAuth 자동 발급 (권장)** — 위 설치가 쓰는 기본 방식. Google 로그인 한 번으로 끝나고, 토큰은 키체인(service `trip-planner`, account `api-pat`)에 저장됩니다. 만료(기본 30일) 시 MCP가 자동 재인증합니다.
- **디바이스 인증 (헤드리스)** — 브라우저를 못 여는 서버·컨테이너용. 다른 기기의 브라우저로 승인합니다.
- **수동 토큰 발급 (고급)** — 웹 [`/settings`](https://trip.idean.me/settings) → "API 토큰" → "수동 발급 (고급)". 무제한 토큰이라 탈취 위험이 있어 일반 사용자에게는 권장하지 않습니다.

세 방식의 상세와 재로그인·키체인 규약은 [`docs/auth-cli.md`](../docs/auth-cli.md)에 정리돼 있습니다.

## 다른 AI 클라이언트 (Cursor 등)

MCP를 지원하는 클라이언트라면 `trip` 서버를 등록해 같은 방식으로 쓸 수 있습니다. 서버 실행 커맨드·인증 토큰은 위 설치가 만든 값(가상환경의 `server` 실행 + 키체인 토큰)을 참고하세요.

## 제공 도구

- **일정 관리** — 여행·일자·활동 CRUD, 순서 변경, 동행자·호텔 조회 등.
- **검색** — 목적지·항공편·숙소·관광지·식당 검색.

전체 도구 목록과 파라미터는 서버가 MCP 프로토콜로 노출하며, API 스펙은 앱 안 [`/docs`](https://trip.idean.me/docs)(OpenAPI)에서 볼 수 있습니다.

## 구성

| 파일 | 역할 |
|------|------|
| `trip_mcp/server.py` | FastMCP 진입점 |
| `trip_mcp/planner.py` | 일정 관리 도구 |
| `trip_mcp/search.py` | 검색 도구 |
| `trip_mcp/web_client.py` | REST API 호출 + 토큰 인증·자동 갱신 |
| `trip_mcp/rapidapi.py` | 외부 검색 API 클라이언트 |
