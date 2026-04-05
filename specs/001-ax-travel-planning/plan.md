# Implementation Plan: AX 기반 여행 플래닝 + 모바일 딜리버리

**Branch**: `001-ax-travel-planning` | **Date**: 2026-03-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-ax-travel-planning/spec.md`

## Summary

사용자가 자연어로 여행 조건을 제시하면, Claude가 CLI 스크립트/모듈을 통해 숙소·항공편·관광지를 검색하고 분석·추천한다. 식당과 도시 간 교통은 Claude 웹 검색(딥 리서치) + 최신 리뷰 크로스체크로 추천한다. 확정된 여행 요소로 일별 일정과 전체 요약을 마크다운으로 생성하며, GitHub Pages(Next.js static export) 웹앱을 통해 동행자에게 모바일로 공유한다.

> **아키텍처 결정**: [ADR-001](adr/001-fe-only-stateless-architecture.md) 참조

## Technical Context

**Language/Version**: Python 3.14 (검색 CLI), Node.js 20 (웹앱)
**Primary Dependencies**: httpx, python-dotenv, pytest (검색) / Next.js, React (웹앱)
**Storage**: 마크다운 파일 (`trips/` 디렉토리, git 관리), 정적 JSON (빌드 번들)
**Testing**: pytest 자동 검증 (API 파싱·포맷팅) + 실제 여행 데이터 E2E
**Target Platform**: CLI 스크립트 (검색) + Next.js 웹앱 (GitHub Pages, 모바일 딜리버리)
**Project Type**: CLI 스크립트 (검색 도구) + FE-only 웹앱 (딜리버리)
**Performance Goals**: API 응답 30초 이내 (httpx timeout)
**Constraints**: Booking.com API 월 250건 (Basic $8.99), FE-only Stateless, GitHub Pages (정적 export)
**Currency**: KRW 기본, 다중 플랫폼 예약 링크 (Booking.com, Agoda, Hotels.com, Google Hotels)
**Distribution**: PyPI (trip-planner-mcp v1.0.2), 1줄 설치 (curl | bash), Claude Desktop 자동 설정, Claude Code 유저 스코프 MCP (`claude mcp add -s user`)
**Authentication**: macOS 키체인 우선 (서비스: `trip-planner`, 계정: `rapidapi-key`), `.env` 폴백
**Scale/Scope**: 1건 여행 (15일, 5개 도시), 사용자 1명 + 동행자 2~5명

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 검증 | 결과 |
|------|------|------|
| **I. AX-First** | 모든 검색·분석·생성이 Claude Desktop/Code를 통해 수행됨. MCP 도구 + CLI 스크립트가 데이터 수집, Claude가 분석·추천·생성 담당. 식당·교통은 Claude 웹 검색으로 딥 리서치. 사용자는 자연어로 요청하고 결과를 확인·피드백만 함 | PASS |
| **II. Minimum Cost** | Booking.com RapidAPI $8.99/월만 사용. AppPaaS 무료 (사내 인프라). 식당·교통은 Claude 웹 검색 (추가 API 없음). 별도 Claude API 과금 없음 | PASS |
| **III. Mobile-First Delivery** | AppPaaS Next.js 웹앱으로 모바일 반응형 제공. 리스트 형태, 일별 개별 페이지, 탭 가능한 링크 | PASS |
| **IV. Incremental Release** | v1은 CLI 스크립트 + 마크다운 생성 + AppPaaS 웹앱. 각 US별 독립 구현·검증 가능 | PASS |

**Post-Design Re-check**: 모든 원칙 PASS. Complexity Tracking 해당 없음.

## Project Structure

### Documentation (this feature)

```text
specs/001-ax-travel-planning/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── mcp-tools.md     # 검색 도구 인터페이스 계약 (MCP + CLI)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── travel_mcp/                 # PyPI 패키지 (trip-planner-mcp)
│   ├── __init__.py             # 버전 정보
│   ├── api_client.py           # RapidAPI 공용 클라이언트 (키체인 → 환경변수 폴백)
│   └── server.py               # MCP 도구 8개 (hotels+flights+attractions)
├── app/                        # Next.js 웹앱 (App Router, GitHub Pages)
│   ├── page.tsx                # 메인: 여행 개요 + 일정 목차
│   └── day/[num]/page.tsx      # 일별 상세 일정
└── lib/
    └── trips.ts                # 마크다운 → HTML 변환 (remark + remark-gfm)

scripts/                        # CLI 스크립트 + 설치/검증
├── install.sh                  # 1줄 설치 스크립트 (curl | bash)
├── setup.sh                    # 개발 환경 설정
├── search_attraction_locations.py
├── search_attractions.py
├── get_attraction_details.py
├── validate-daily.py           # 데일리 파일 포맷 검증
└── validate-budget.py          # 예산 포맷 검증

tests/                          # 자동 검증 테스트
├── unit/                       # API 파싱·포맷팅 단위 테스트
└── integration/                # CLI 스크립트 통합 테스트

trips/                          # 여행 데이터 (마크다운)
└── {year}-{trip-name}/         # CLAUDE.md에 정의된 구조
    ├── overview.md
    ├── itinerary.md
    ├── daily/
    │   └── dayNN-MMDD-*.md
    ├── accommodations.md
    ├── transport.md
    ├── budget.md
    └── ...
```

**Structure Decision**: Python MCP 서버(`src/travel_mcp/`)와 Next.js 웹앱(`src/app/`, `src/lib/`)이 루트에 공존. GitHub Pages로 정적 배포(static export), 커스텀 도메인 `trip.idean.me`. BE 확장 시 AppPaaS/Vercel로 전환 가능. 아키텍처 결정은 [ADR-001](adr/001-fe-only-stateless-architecture.md) 참조.

## 모바일 UX 개선 (FR-013~016)

### 오늘의 일정 보기 (FR-013)
- **클라이언트 컴포넌트**: `src/components/TodayButton.tsx` — 서버에서 전달받은 날짜+타임존으로 `Intl.DateTimeFormat`으로 현지시각 매칭
- **타임존 매핑**: `src/lib/trips.ts`에 도시→타임존 매핑 (`lisbon→Europe/Lisbon`, `porto→Europe/Lisbon`, 나머지→`Europe/Madrid`)
- **데이터**: `TripMeta`에 `days: {dayNum, fullDate, timezone}[]` 추가. 연도는 trip slug에서 추출, MMDD는 daily 파일명에서 추출
- **자동 리다이렉트 금지**: 버튼 클릭 시에만 이동. 무한루프 방지

### 브레드크럼 + 상단 네비게이션 (FR-014)
- 서버 컴포넌트로 구현. 일별 페이지 상단에 `여행명 > DAY N` 형태
- 전날/다음날 네비게이션을 하단에서 상단으로 이동

### 날씨 표시 (FR-015)
- `src/lib/trips.ts`에 `extractWeatherFromOverview()` — overview.md 날씨 테이블 파싱
- 일별 페이지 상단: 해당 도시 날씨 배지 표시
- 전체 날씨 테이블: `<details>` HTML 엘리먼트로 접힘 (JS 불필요, 정적 export 호환)

### 맨 위로 버튼 (FR-016)
- **클라이언트 컴포넌트**: `src/components/ScrollToTop.tsx` — `scroll` 이벤트로 300px 이상 시 표시
- `layout.tsx`에 삽입. z-index 관리 (z-30, 헤더 z-20 위)

### 클라이언트 컴포넌트 최소화 원칙
- 클라이언트 컴포넌트: `TodayButton`, `ScrollToTop` (2개만)
- 날씨 토글: `<details>/<summary>` (순수 HTML, JS 불필요)
- 브레드크럼/네비게이션: 서버 컴포넌트 (기존 패턴 유지)
