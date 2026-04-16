# Trip Planner

여행 서포터/플래너 — MCP 검색 + 구조화 일정 관리 + Next.js 웹앱 + Neon Postgres

## 주요 기능

- **구조화 활동 관리**: 카테고리/시간/장소/비용/예약상태를 개별 필드로 관리
- **MCP 플러그인**: Claude Desktop/Code에서 숙소, 항공편, 관광지 검색 및 활동 CRUD
- **API 인증**: PAT(Personal Access Token) 기반 외부 클라이언트 인증
- **API 문서**: OpenAPI 3.0 스펙 + Scalar 인터랙티브 뷰어 (/docs)
- **캘린더 연동**: 여행 일정을 Apple 캘린더에 자동 등록 (iCloud 공유 지원)
- **일정 웹앱**: DB 기반 일정을 모바일 친화적 웹페이지로 공유
- **macOS 키체인**: API 키, PAT를 안전하게 관리
- **OAuth CLI 인증**: install.sh에서 브라우저 로그인 1회로 PAT 자동 발급 (수동 복사 불필요)
- **MCP 자동 재인증**: 토큰 만료 시 브라우저 재인증 → 키체인 갱신 → 요청 자동 재시도

## 프로젝트 구조

```
trip-planner/
├── src/                      # Next.js 웹앱 (Vercel 배포)
│   ├── app/
│   │   ├── api/trips/        # 여행/일자/활동/멤버 API
│   │   ├── api/tokens/       # PAT CRUD API
│   │   ├── api/openapi/      # OpenAPI JSON
│   │   ├── settings/         # PAT 관리 UI
│   │   └── docs/             # API 문서 뷰어
│   ├── components/
│   │   ├── ActivityCard.tsx   # 활동 카드 (카테고리/시간/비용)
│   │   ├── ActivityForm.tsx   # 활동 입력 폼 (현지 시각 자동)
│   │   └── ActivityList.tsx   # 활동 목록 + CRUD 관리
│   └── lib/
│       ├── auth-helpers.ts   # 세션 + PAT 인증
│       ├── openapi.ts        # OpenAPI 스펙
│       └── prisma.ts         # Prisma 클라이언트
├── mcp/                      # MCP 서버 (PyPI 배포, 로컬 실행)
│   └── trip_mcp/
│       ├── server.py         # 통합 엔트리포인트 (20개 도구)
│       ├── search.py         # 검색 도구 8개 (RapidAPI)
│       ├── planner.py        # 일정 관리 도구 12개 (웹 API)
│       ├── rapidapi.py       # RapidAPI 클라이언트
│       └── web_client.py     # 웹 API 클라이언트 (PAT 인증)
├── prisma/
│   ├── schema.prisma         # DB 스키마 (Auth.js + App + Activity + PAT)
│   └── migrations/
├── e2e/                      # Playwright E2E 테스트
├── tests/                    # 단위 테스트 (Vitest + pytest)
├── trips/                    # 여행 일정 데이터 (레거시 마크다운)
├── specs/                    # 설계 문서 (스펙, 플랜, 태스크)
└── pyproject.toml            # MCP 서버 (PyPI)
```

## 설치 / 업데이트 (맥북, 1줄)

신규 설치와 기존 v1 업데이트 모두 동일한 명령입니다:

```bash
curl -sSL https://raw.githubusercontent.com/idean3885/trip-planner/main/scripts/install.sh | bash
```

실행 후 **Claude Desktop을 재시작**하면 바로 사용 가능합니다.

자동 처리 항목:
- RapidAPI 키 → 키체인 저장 (검색용, 이미 있으면 스킵)
- Trip Planner PAT → **브라우저 OAuth 자동 발급** (키체인 저장, 수동 입력 폴백)
- Claude Desktop MCP 설정 자동 등록/업데이트
- Apple 캘린더 MCP 자동 설치 (macOS 전용)
- v1 → v2 자동 마이그레이션 (구 서버 설정 제거, GitHub PAT 정리)

## 사용법

Claude Desktop 또는 Claude Code에서:

```
# 검색
"바르셀로나 6월 16일~20일 4박 숙소 추천해줘"
"포르투에서 리스본 가는 6월 10일 항공편 찾아줘"

# 활동 관리 (PAT 설정 필요)
"내 여행 목록 보여줘"
"3일차에 벨렘탑 관광 추가해줘 (09:00~11:00)"
"1일차 마크다운을 활동으로 변환해줘"
```

### Claude Code 등록

```bash
claude mcp add trip -s user -- ~/.trip-planner/.venv/bin/python -m trip_mcp.server
```

## MCP 도구 (20개)

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
| 일정 | list_trips | 내 여행 목록 |
| | get_trip | 여행 상세 + 일자별 활동 수 |
| | create_day | 일자 추가 |
| | update_day | 일자 수정 |
| | delete_day | 일자 삭제 |
| | list_members | 멤버 목록 |
| 활동 | create_activity | 활동 추가 (카테고리/시간/장소/비용) |
| | update_activity | 활동 수정 |
| | delete_activity | 활동 삭제 |
| | reorder_activities | 활동 순서 변경 |
| 변환 | get_day_content | 일자 마크다운 전체 조회 |
| | clear_day_content | 변환 후 마크다운 정리 |

## API 문서

- **웹 뷰어**: https://trip.idean.me/docs
- **OpenAPI JSON**: https://trip.idean.me/api/openapi

## 개발자용

```bash
# 웹앱 개발
npm install
npm run dev                    # http://localhost:3000

# 테스트
npm test                       # Vitest (API + 컴포넌트)
npm run test:coverage          # 커버리지 리포트
npx playwright test            # E2E 테스트

# MCP 서버 개발
cd mcp/
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest tests/ -v

# PAT 생성 (MCP 테스트용)
# 1) http://localhost:3000/settings 에서 토큰 생성
# 2) TRIP_PLANNER_PAT=<token> python -m trip_mcp.server
```

## 기술 스택

- **MCP 서버**: Python 3.10+, FastMCP, httpx, macOS Keychain
- **웹앱**: Next.js 15 (App Router, SSR), Auth.js v5, Tailwind CSS v3
- **DB**: Neon Postgres, Prisma 7 (@prisma/adapter-pg TCP)
- **인증**: Google OAuth (웹), PAT (외부 클라이언트)
- **테스트**: Vitest, React Testing Library, Playwright, pytest
- **배포**: Vercel (웹앱), PyPI (MCP)

## 배포 환경

| 환경 | 도메인 | 브랜치 | 용도 |
|------|--------|--------|------|
| Production | [trip.idean.me](https://trip.idean.me) | main | 정식 릴리즈 |
| Dev | [dev.trip.idean.me](https://dev.trip.idean.me) | develop | 마일스톤 통합 테스트 |
| Preview | PR별 자동 생성 | feature/* | 피처 단위 프리뷰 |

### Git 전략: Git Flow Lite

```
main ────────●───────────────●──── (production 릴리즈 + 버전 태그)
             ↑               ↑
develop ──●──●──●──●──●──●──●──── (dev 통합 배포)
          ↑  ↑  ↑  ↑  ↑  ↑
        feature branches (NNN-short-name)
```

- **feature → develop**: 피처 개발 PR. dev 환경에서 통합 테스트.
- **develop → main**: 마일스톤 완료 시 릴리즈 PR. CI가 자동으로 태그 + GitHub Release + PyPI 배포.

### 릴리즈 자동화

1. `pyproject.toml` 버전 범프 → develop → main PR 머지
2. CI: annotated 태그 자동 생성 → CHANGELOG 기반 GitHub Release → PyPI 배포
