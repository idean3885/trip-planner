# Implementation Plan: v2.0.0 AX + API MCP

**Branch**: `005-ax-api-mcp` | **Date**: 2026-04-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-ax-api-mcp/spec.md`

## Summary

v1의 검색 전용 MCP 서버를 확장하여 웹 API 기반 일정 CRUD를 통합한 단일 MCP 서버(trip-mcp)를 제공한다. PAT 인증 인프라를 추가하여 외부 클라이언트가 기존 API를 호출할 수 있게 하고, 폐기 대상 코드를 정리하며, 저장소 구조를 웹앱/MCP로 명확히 분리한다.

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 웹앱) + Python 3.10+ (MCP 서버)
**Primary Dependencies**:
- 웹: Next.js 15, Auth.js v5 (next-auth@5.x), Prisma 7 (@prisma/adapter-pg TCP)
- MCP: FastMCP (mcp[cli]>=1.2.0), httpx
**Storage**: Neon Postgres (Vercel Marketplace, Prisma ORM)
**Testing**: pytest (Python MCP), ESLint (TypeScript)
**Target Platform**: Vercel (웹앱 배포), macOS (MCP 로컬 실행)
**Project Type**: Web service + MCP server (듀얼)
**Performance Goals**: API 응답 < 1초, MCP 도구 호출 → 웹 반영 < 30초
**Constraints**: Vercel Hobby 무료 티어, Neon 0.5GB
**Scale/Scope**: 사용자 5명 이하 (개발자 1 + 동행자 2~5)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 게이트 | 결과 |
| ---- | ------ | ---- |
| I. AX-First | MCP 도구가 검색+CRUD 모두 수행하는가? | ✅ trip_mcp에서 search + planner 도구 통합 |
| II. Minimum Cost | 추가 비용이 발생하는가? | ✅ 기존 무료 인프라만 사용 |
| III. Mobile-First | 변경 결과가 모바일 웹에서 확인 가능한가? | ✅ API → DB → SSR 페이지 즉시 반영 |
| IV. Incremental Release | v1 기능이 깨지는가? | ✅ 검색 도구 100% 유지, CRUD 추가 |

## Project Structure

### Documentation (this feature)

```text
specs/005-ax-api-mcp/
├── plan.md              # 이 파일
├── research.md          # Phase 0: 기술 결정 근거
├── data-model.md        # Phase 1: PersonalAccessToken 모델
├── quickstart.md        # Phase 1: 개발자 셋업 가이드
├── contracts/
│   ├── api.md           # Phase 1: PAT API 엔드포인트
│   └── mcp-tools.md     # Phase 1: trip-mcp 도구 정의
└── tasks.md             # Phase 2: 태스크 목록 (/speckit.tasks)
```

### Source Code (repository root)

```text
src/                          ← Next.js 전용 (Vercel 배포 대상)
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── trips/...          # 기존 Trip/Day CRUD
│   │   ├── tokens/route.ts    # NEW: PAT 생성/목록
│   │   ├── tokens/[id]/route.ts  # NEW: PAT 삭제
│   │   └── openapi/route.ts   # NEW: OpenAPI JSON
│   ├── settings/page.tsx      # NEW: PAT 관리 UI
│   └── docs/page.tsx          # NEW: API 문서 뷰어 (선택)
├── components/
├── lib/
│   ├── auth-helpers.ts        # MODIFY: PAT 인증 추가
│   ├── prisma.ts
│   └── openapi.ts             # NEW: OpenAPI 스펙 정의
└── middleware.ts

mcp/                          ← Python MCP (로컬 실행, PyPI 배포)
└── trip_mcp/
    ├── __init__.py
    ├── server.py              # 통합 FastMCP 엔트리포인트
    ├── search.py              # 검색 도구 (기존 travel_mcp에서 이동)
    ├── planner.py             # CRUD 도구 (NEW)
    ├── rapidapi.py            # RapidAPI 클라이언트 (기존 api_client.py)
    └── web_client.py          # 웹 API 클라이언트 (NEW, PAT 인증)

tests/                        ← Python 테스트
├── unit/
└── integration/
```

**Structure Decision**: `src/`는 Next.js 전용으로 Vercel 배포 대상만 포함. `mcp/`는 Python MCP 서버로 PyPI 배포 및 로컬 실행 대상. 기존 `src/travel_mcp/`, `src/feedback_mcp/`, `mcp-servers/hotels_mcp_server/`는 삭제하고 `mcp/trip_mcp/`로 통합.

## Implementation Phases

### Phase A: PAT 인증 인프라 (FR-002, FR-003, FR-004)

1. Prisma 스키마에 `PersonalAccessToken` 모델 추가
2. `prisma migrate dev`로 마이그레이션 생성
3. `src/lib/auth-helpers.ts` 확장: `Authorization: Bearer <pat>` 헤더 인식
4. `src/app/api/tokens/route.ts`: PAT 생성(POST) + 목록(GET)
5. `src/app/api/tokens/[id]/route.ts`: PAT 삭제(DELETE)
6. `src/app/settings/page.tsx`: PAT 관리 UI

### Phase B: 레포 정리 + 디렉토리 구조 (FR-009, FR-010, FR-011)

1. `mcp/trip_mcp/` 디렉토리 생성
2. `src/travel_mcp/` → `mcp/trip_mcp/`로 이동 + 리네임
3. `src/feedback_mcp/` 삭제
4. `mcp-servers/hotels_mcp_server/` 삭제
5. `pyproject.toml` 업데이트: 패키지 경로, 엔트리포인트, 버전 2.0.0
6. `tests/` 경로 업데이트

### Phase C: trip-mcp 통합 (FR-001, FR-005)

1. `mcp/trip_mcp/web_client.py`: PAT 기반 HTTP 클라이언트
2. `mcp/trip_mcp/planner.py`: CRUD MCP 도구 구현
   - `list_trips()`: 사용자의 여행 목록 조회
   - `get_trip(trip_id)`: 여행 상세 + 일자 목록
   - `update_day(trip_id, day_id, ...)`: 일자 내용 수정
   - `create_day(trip_id, date, title, content)`: 일자 추가
   - `delete_day(trip_id, day_id)`: 일자 삭제
3. `mcp/trip_mcp/server.py`: search + planner 도구 통합 등록
4. 기존 검색 도구 8개 동작 검증

### Phase D: API 문서화 (FR-006)

1. OpenAPI 3.0 스펙 작성 (수동 또는 코드 생성)
2. `/api/openapi` 엔드포인트: JSON 스펙 제공
3. API 문서 뷰어 페이지 (Scalar 또는 swagger-ui-react)

### Phase E: 설치 스크립트 + 패키징 (FR-007, FR-008)

1. `scripts/install.sh` 전면 개편
   - RapidAPI 키 설정 유지
   - trip-planner PAT 설정 추가 (웹에서 생성 → 입력 → 키체인 저장)
   - feedback MCP 서버 설정 제거 (v1 마이그레이션)
   - 단일 MCP 서버 등록 (trip-mcp)
2. `manifest.json` 업데이트
3. `.mcp.json` 업데이트
4. `claude_desktop_config.example.json` 업데이트
5. PyPI 배포: trip-planner-mcp 2.0.0

## Key Technical Decisions

| 결정 | 선택 | 근거 |
| ---- | ---- | ---- |
| PAT 저장 | SHA-256 해시 저장, 원문은 생성 시 1회만 노출 | 보안 표준. 토큰 prefix(tp_xxx...)만 목록에 표시 |
| 인증 확장 | auth-helpers.ts에서 Bearer 토큰 → DB 조회 | 기존 세션 인증과 병행, 최소 변경 |
| MCP 통합 | 하나의 FastMCP 서버에 search + planner 도구 등록 | 사용자가 MCP 1개만 설치. 인증 2종(RapidAPI 키 + PAT)은 내부 처리 |
| 패키지 경로 | `src/` → `mcp/` 분리, pyproject.toml `where = ["mcp"]` | Vercel은 src/ 만 빌드, Python은 mcp/ 에서 독립 |
| API 문서 | OpenAPI 3.0 JSON + 뷰어 | 기계 판독 가능 + 포트폴리오 시각적 어필 |
| PyPI 이름 | `trip-planner-mcp` 유지, 버전 2.0.0 | 기존 설치자 `uvx trip-planner-mcp` 호환 |

## Complexity Tracking

> Constitution Check 위반 없음 — 이 섹션은 해당 사항 없음.
