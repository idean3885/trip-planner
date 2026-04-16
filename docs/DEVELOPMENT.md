# 개발 가이드

## 기술 스택

- **MCP 서버**: Python 3.10+, FastMCP, httpx, macOS Keychain
- **웹앱**: Next.js 15 (App Router, SSR), Auth.js v5, Tailwind CSS v3
- **DB**: Neon Postgres, Prisma 7 (@prisma/adapter-pg TCP)
- **인증**: Google OAuth (웹), PAT (외부 클라이언트), OAuth CLI (자동 발급)
- **테스트**: Vitest, React Testing Library, Playwright, pytest
- **배포**: Vercel (웹앱), PyPI (MCP)

## 프로젝트 구조

```
trip-planner/
├── src/                      # Next.js 웹앱 (Vercel 배포)
│   ├── app/
│   │   ├── api/trips/        # 여행/일자/활동/멤버 API
│   │   ├── api/tokens/       # PAT CRUD API
│   │   ├── api/auth/cli/     # OAuth CLI 인증 엔드포인트
│   │   ├── api/openapi/      # OpenAPI JSON
│   │   ├── settings/         # PAT 관리 UI
│   │   └── docs/             # API 문서 뷰어 (Scalar)
│   ├── components/
│   │   ├── ActivityCard.tsx   # 활동 카드 (카테고리/시간/비용)
│   │   ├── ActivityForm.tsx   # 활동 입력 폼
│   │   └── ActivityList.tsx   # 활동 목록 + CRUD
│   └── lib/
│       ├── auth-helpers.ts   # 세션 + PAT 듀얼 인증
│       ├── token-helpers.ts  # PAT 생성 공유 헬퍼
│       ├── openapi.ts        # OpenAPI 스펙
│       └── prisma.ts         # Prisma 클라이언트
├── mcp/                      # MCP 서버 (PyPI 배포)
│   └── trip_mcp/
│       ├── server.py         # 통합 엔트리포인트 (20개 도구)
│       ├── search.py         # 검색 도구 8개 (RapidAPI)
│       ├── planner.py        # 일정 관리 도구 12개 (웹 API)
│       ├── rapidapi.py       # RapidAPI 클라이언트
│       └── web_client.py     # 웹 API 클라이언트 (PAT 인증 + 자동 재인증)
├── prisma/schema.prisma      # DB 스키마
├── tests/                    # 단위 테스트 (Vitest + pytest)
├── e2e/                      # Playwright E2E 테스트
├── specs/                    # 설계 문서 (speckit)
└── .github/workflows/        # CI/CD (auto-tag, auto-release, pypi-publish)
```

## 로컬 개발

```bash
# 웹앱
npm install
npm run dev                    # http://localhost:3000

# MCP 서버
cd mcp/
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

# Claude Code에 MCP 등록
claude mcp add trip -s user -- ~/.trip-planner/.venv/bin/python -m trip_mcp.server
```

## 테스트

```bash
npm test                       # Vitest (API + 컴포넌트)
npm run test:coverage          # 커버리지 리포트
npx playwright test            # E2E 테스트
pytest tests/ -v               # MCP 서버 테스트
npx tsc --noEmit               # 타입 체크
```

## 배포 환경

| 환경 | 도메인 | 브랜치 | 용도 |
|------|--------|--------|------|
| Production | [trip.idean.me](https://trip.idean.me) | main | 정식 릴리즈 |
| Dev | [dev.trip.idean.me](https://dev.trip.idean.me) | develop | 마일스톤 통합 테스트 |
| Preview | PR별 자동 생성 | feature/* | 피처 단위 프리뷰 |

## Git 전략: Git Flow Lite

```
main ────────────●───────────────●──── (production 릴리즈 + 버전 태그)
                 ↑               ↑
develop ──●──●──●───●──●──●──●──● ── (dev 통합 배포)
          ↑  ↑  ↑   ↑  ↑  ↑  ↑
        feature branches (NNN-short-name)
```

- **feature → develop PR**: 피처 개발. dev 환경에서 통합 테스트.
- **develop → main PR**: 마일스톤 완료 시 릴리즈. CI가 자동으로 태그 + Release + PyPI.

## 릴리즈 프로세스

**수동 (develop에서)**:
1. `CHANGELOG.md`에 새 버전 섹션 추가
2. `pyproject.toml` version 범프
3. develop → main PR → 머지

**CI 자동 (main 머지 후)**:
4. `auto-tag.yml`: annotated 태그 생성
5. `auto-release.yml`: CHANGELOG 추출 → GitHub Release
6. `pypi-publish.yml`: 테스트 → PyPI 배포

**버전 범프 기준 (SemVer)**:
- MAJOR: 호환성 깨지는 변경
- MINOR: 기능 추가
- PATCH: 버그 수정, 문서 수정

## API 문서

- **웹 뷰어**: [trip.idean.me/docs](https://trip.idean.me/docs)
- **OpenAPI JSON**: [trip.idean.me/api/openapi](https://trip.idean.me/api/openapi)

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
