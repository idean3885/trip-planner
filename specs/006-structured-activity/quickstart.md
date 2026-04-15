# Quickstart: 일정 구조화 개발 가이드

**Feature**: 006-structured-activity

## 사전 요구

- Node.js 20+, npm
- Python 3.10+, pip
- Neon Postgres 접속 (DATABASE_URL)

## 웹앱 개발

```bash
# 의존성 설치
npm install

# Prisma 마이그레이션 (Activity 모델 추가 후)
npx prisma migrate dev --name add-activity

# 개발 서버
npm run dev
# → http://localhost:3000
```

## MCP 서버 개발

```bash
# 가상환경
cd mcp/
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

# 도구 확인 (18개 예상)
python -c "
import asyncio
from mcp.server.fastmcp import FastMCP
from trip_mcp.search import register_search_tools
from trip_mcp.planner import register_planner_tools

mcp = FastMCP('trip')
register_search_tools(mcp)
register_planner_tools(mcp)

async def check():
    tools = await mcp.list_tools()
    print(f'Total: {len(tools)} tools')
asyncio.run(check())
"

# 단위 테스트
pytest tests/unit/ -v
```

## 테스트 시나리오

### Activity CRUD (MCP)
1. `create_activity(trip_id=4, day_id=1, category="SIGHTSEEING", title="벨렘탑", start_time="10:00", end_time="12:00")`
2. `update_activity(trip_id=4, day_id=1, activity_id=N, memo="입장료 €8")`
3. 웹에서 확인: trip.idean.me/trips/4/day/1
4. `delete_activity(trip_id=4, day_id=1, activity_id=N)`

### 구조화 폼 (웹)
1. 일자 상세 페이지 → "활동 추가" 클릭
2. 카테고리/시간/장소/메모 입력 → 저장
3. 활동 카드로 표시 확인
4. 편집/삭제 확인
