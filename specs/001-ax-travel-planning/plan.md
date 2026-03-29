# Implementation Plan: AX 기반 여행 플래닝 + 모바일 딜리버리

**Branch**: `001-ax-travel-planning` | **Date**: 2026-03-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-ax-travel-planning/spec.md`

## Summary

사용자가 자연어로 여행 조건을 제시하면, Claude가 CLI 스크립트/모듈을 통해 숙소·항공편·관광지를 검색하고 분석·추천한다. 식당과 도시 간 교통은 Claude 웹 검색(딥 리서치) + 최신 리뷰 크로스체크로 추천한다. 확정된 여행 요소로 일별 일정과 전체 요약을 마크다운으로 생성하며, AppPaaS Next.js 웹앱을 통해 동행자에게 모바일로 공유한다.

> **아키텍처 결정**: [ADR-001](adr/001-fe-only-stateless-architecture.md) 참조

## Technical Context

**Language/Version**: Python 3.14 (검색 CLI), Node.js 20 (웹앱)
**Primary Dependencies**: httpx, python-dotenv, pytest (검색) / Next.js, React (웹앱)
**Storage**: 마크다운 파일 (`trips/` 디렉토리, git 관리), 정적 JSON (빌드 번들)
**Testing**: pytest 자동 검증 (API 파싱·포맷팅) + 실제 여행 데이터 E2E
**Target Platform**: CLI 스크립트 (검색) + Next.js 웹앱 (AppPaaS, 모바일 딜리버리)
**Project Type**: CLI 스크립트 (검색 도구) + FE-only 웹앱 (딜리버리)
**Performance Goals**: API 응답 30초 이내 (httpx timeout)
**Constraints**: Booking.com API 월 250건 (Basic $8.99), AppPaaS Node 20, FE-only Stateless
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
mcp-servers/
└── hotels_mcp_server/          # 기존 MCP 서버 (hotels + flights, 유지)
    ├── main.py                 # 엔트리포인트
    ├── hotels_mcp/
    │   ├── __init__.py
    │   ├── api_client.py       # RapidAPI 공용 클라이언트 (CLI에서도 재사용)
    │   └── hotels_server.py    # MCP 도구 정의 (hotels + flights)
    ├── .env                    # API 키 (gitignore)
    ├── requirements.txt
    └── .venv/

scripts/                        # CLI 스크립트 (검색 도구)
├── search_attraction_locations.py  # 관광지 위치 검색
├── search_attractions.py           # 관광지 목록 검색
├── get_attraction_details.py       # 관광지 상세 조회
├── validate-daily.py               # 데일리 파일 포맷 검증 (구현 완료)
└── validate-budget.py              # 예산 포맷 검증 (구현 완료)

web/                            # Next.js 웹앱 (AppPaaS 배포)
├── package.json
├── next.config.js
├── src/
│   ├── app/                    # App Router
│   └── components/
└── public/

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

**Structure Decision**: 기존 `mcp-servers/` MCP 서버(Hotels + Flights)는 유지. Attractions 검색은 `scripts/` 에 CLI 스크립트로 구현하며 `api_client.py`를 재사용. 웹앱은 `web/` 디렉토리에 Next.js 프로젝트로 신규 추가. `_config.yml`(GitHub Pages)은 제거 예정. 아키텍처 결정은 [ADR-001](adr/001-fe-only-stateless-architecture.md) 참조.
