# Implementation Plan: AX 기반 여행 플래닝 + 모바일 딜리버리

**Branch**: `001-ax-travel-planning` | **Date**: 2026-03-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-ax-travel-planning/spec.md`

## Summary

사용자가 자연어로 여행 조건을 제시하면, Claude가 MCP 도구를 통해 숙소·항공편·관광지를 검색하고 분석·추천한다. 식당과 도시 간 교통은 Claude 웹 검색(딥 리서치) + 최신 리뷰 크로스체크로 추천한다. 확정된 여행 요소로 일별 일정과 전체 요약을 마크다운으로 생성하며, GitHub Pages Project Site를 통해 동행자에게 모바일로 공유한다.

## Technical Context

**Language/Version**: Python 3.14
**Primary Dependencies**: FastMCP, httpx, python-dotenv, pytest
**Storage**: 마크다운 파일 (`trips/` 디렉토리, git 관리)
**Testing**: pytest 자동 검증 (API 파싱·포맷팅) + 실제 여행 데이터 E2E
**Target Platform**: Claude Desktop/Code (MCP 서버) + GitHub Pages Project Site (모바일 딜리버리)
**Project Type**: MCP 서버 (도구 제공) + 정적 사이트 (딜리버리)
**Performance Goals**: API 응답 30초 이내 (httpx timeout)
**Constraints**: Booking.com API 월 250건 (Basic $8.99), 추가 비용 없음
**Scale/Scope**: 1건 여행 (15일, 5개 도시), 사용자 1명 + 동행자 2~5명

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 검증 | 결과 |
|------|------|------|
| **I. AX-First** | 모든 검색·분석·생성이 Claude Desktop/Code를 통해 수행됨. MCP 도구가 데이터 수집, Claude가 분석·추천·생성 담당. 식당·교통은 Claude 웹 검색으로 딥 리서치. 사용자는 자연어로 요청하고 결과를 확인·피드백만 함 | PASS |
| **II. Minimum Cost** | Booking.com RapidAPI $8.99/월만 사용. GitHub Pages 무료. 식당·교통은 Claude 웹 검색 (추가 API 없음). 별도 Claude API 과금 없음 | PASS |
| **III. Mobile-First Delivery** | GitHub Pages Project Site + Jekyll minima 테마로 모바일 반응형 기본 제공. 테이블 대신 리스트 형태, 일별 개별 페이지, 탭 가능한 링크 | PASS |
| **IV. Incremental Release** | v1은 MCP 도구 + 마크다운 생성 + GitHub Pages. v2 웹앱 기능 미포함. 각 US별 독립 구현·검증 가능 | PASS |

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
│   └── mcp-tools.md     # MCP 도구 인터페이스 계약
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
mcp-servers/
└── hotels_mcp_server/          # 기존 MCP 서버 (travel 통합)
    ├── main.py                 # 엔트리포인트
    ├── hotels_mcp/
    │   ├── __init__.py
    │   └── hotels_server.py    # MCP 도구 정의 (hotels + flights + attractions)
    ├── .env                    # API 키 (gitignore)
    ├── requirements.txt
    └── .venv/

tests/                          # 자동 검증 테스트
├── unit/                       # API 파싱·포맷팅 단위 테스트
└── integration/                # MCP 도구 통합 테스트

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

_config.yml                     # GitHub Pages 설정 (신규)
```

**Structure Decision**: 기존 `mcp-servers/hotels_mcp_server/` 구조를 유지하고 Attractions MCP 도구를 추가. `trips/` 디렉토리는 기존 CLAUDE.md 정의 구조 유지. `tests/` 디렉토리를 루트에 신규 추가. GitHub Pages 설정을 위한 `_config.yml`을 루트에 신규 추가.
