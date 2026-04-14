# Quickstart: v2.0.0 개발자 셋업

## Prerequisites

- Node.js 20+, Python 3.10+
- Neon Postgres (Vercel Marketplace 연동 완료)
- Google OAuth credentials (AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- RapidAPI key (booking-com15 구독)

## 웹앱 개발 환경

```bash
# 의존성 설치
npm install

# DB 마이그레이션 (PersonalAccessToken 포함)
npx prisma migrate dev

# 개발 서버
npm run dev
```

## MCP 개발 환경

```bash
# Python 가상환경
cd mcp/
python3 -m venv .venv
source .venv/bin/activate

# 의존성 설치 (editable mode)
pip install -e ".[dev]"

# MCP 서버 테스트
RAPIDAPI_KEY=<key> TRIP_PLANNER_PAT=<pat> python -m trip_mcp.server
```

## PAT 생성 (MCP 개발/테스트용)

1. `npm run dev`로 웹앱 실행
2. Google 계정으로 로그인
3. `/settings` 페이지에서 "토큰 생성"
4. 토큰을 복사하여 환경변수 또는 키체인에 저장

## 테스트

```bash
# Python 단위 테스트
cd mcp/
pytest tests/unit/ -v

# Python 통합 테스트 (실제 API 호출)
TRIP_PLANNER_PAT=<pat> pytest tests/integration/ -v -m integration
```

## 배포

```bash
# Vercel 배포 (웹앱)
git push origin 005-ax-api-mcp  # Vercel 자동 프리뷰 배포

# PyPI 배포 (MCP)
cd mcp/
python -m build
twine upload dist/*
```
