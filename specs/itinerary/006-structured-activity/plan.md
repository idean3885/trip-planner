# Implementation Plan: 일정 구조화

**Branch**: `006-structured-activity` | **Date**: 2026-04-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-structured-activity/spec.md`

## Summary

Day.content(마크다운 블롭)을 Activity 정규화 스키마로 전환한다. Prisma 모델 추가 → Web API + UI(구조화 폼/카드 뷰) → MCP 도구 확장 → 마크다운 변환 기능 순서로 진행. CHANGELOG.md를 도입하고 README를 갱신한다.

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 15), Python 3.10+ (MCP)
**Primary Dependencies**: Next.js App Router, Prisma 7, FastMCP, httpx, react-markdown
**Storage**: Neon Postgres (Prisma ORM, @prisma/adapter-pg TCP)
**Testing**: pytest (MCP unit), 수동 E2E (웹 + MCP)
**Target Platform**: Vercel (웹), macOS (MCP 서버)
**Project Type**: web-service + CLI tool (MCP)
**Performance Goals**: 구조화 카드 렌더링 3초 이내, 활동 CRUD 응답 1초 이내
**Constraints**: Neon 무료 티어 0.5GB, Vercel Hobby 플랜
**Scale/Scope**: 1~2명 사용, 여행당 최대 20일 × 일당 최대 20개 활동

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 준수 | 근거 |
|------|------|------|
| I. AX-First | PASS | MCP Activity CRUD가 P1, AI 에이전트가 구조화 데이터를 직접 생성 |
| II. Minimum Cost | PASS | Prisma 마이그레이션 + 기존 인프라, 추가 비용 없음 |
| III. Mobile-First | PASS | 구조화 카드가 모바일 반응형, 터치 친화적 폼 |
| IV. Incremental Release | PASS | 기존 마크다운 읽기 전용 호환, 신규 활동은 구조화 |

**GATE RESULT: PASS** — 위반 사항 없음.

## Project Structure

### Documentation (this feature)

```text
specs/006-structured-activity/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
# Web (Next.js)
src/
├── app/
│   ├── api/trips/[id]/days/[dayId]/activities/     # Activity API (신규)
│   │   ├── route.ts                                 # GET, POST
│   │   └── [activityId]/route.ts                    # PUT, DELETE
│   └── trips/[id]/day/[dayId]/page.tsx              # 구조화 뷰 (수정)
├── components/
│   ├── ActivityCard.tsx                              # 활동 카드 (신규)
│   ├── ActivityForm.tsx                              # 활동 폼 (신규)
│   └── DayEditor.tsx                                 # 레거시 마크다운 (수정)
└── lib/
    └── openapi.ts                                    # Activity 엔드포인트 추가

# MCP (Python)
mcp/trip_mcp/
├── planner.py                                        # Activity CRUD 도구 추가
└── server.py                                         # 도구 등록 (14→18)

# DB
prisma/
├── schema.prisma                                     # Activity 모델 추가
└── migrations/                                       # 마이그레이션

# Root
├── CHANGELOG.md                                      # 신규
└── README.md                                         # 업데이트
```

**Structure Decision**: 기존 프로젝트 구조(src/ + mcp/ + prisma/) 유지. 신규 API 라우트와 컴포넌트만 추가.
