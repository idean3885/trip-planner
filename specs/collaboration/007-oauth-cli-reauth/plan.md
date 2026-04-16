# Implementation Plan: OAuth CLI 인증 + MCP 런타임 재인증

**Branch**: `007-oauth-cli-reauth` | **Date**: 2026-04-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-oauth-cli-reauth/spec.md`

## Summary

install.sh의 수동 PAT 복사-붙여넣기를 브라우저 OAuth 1회 인증으로 대체하고, MCP 런타임에서 401 응답 시 동일 엔드포인트를 재사용하여 자동 재인증한다. 서버 측 `/api/auth/cli` 라우트가 세션 인증 후 PAT를 발급하고 localhost로 리다이렉트하는 구조.

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 15), Python 3.10+ (MCP 서버)
**Primary Dependencies**: Next.js App Router, Auth.js v5, Prisma 7.x, FastMCP, httpx
**Storage**: Neon Postgres (Prisma ORM), macOS Keychain (로컬 토큰 저장)
**Testing**: Vitest (TypeScript), pytest + pytest-asyncio + pytest-httpx (Python)
**Target Platform**: macOS (install.sh, Claude Desktop MCP)
**Project Type**: web-service + MCP server
**Performance Goals**: 인증 플로우 30초 이내 완료
**Constraints**: localhost 리다이렉트만 허용, 120초 타임아웃
**Scale/Scope**: 1인 개발, 소규모 사용자

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AX-First | PASS | AI 에이전트의 인증 마찰을 제거하여 AX 향상 |
| II. Minimum Cost | PASS | 추가 비용 없음 — 기존 Auth.js + Neon 무료 티어 재사용 |
| III. Mobile-First | N/A | 인증 플로우는 데스크톱 CLI/MCP 대상 |
| IV. Incremental Release | PASS | 기존 수동 인증 폴백 유지, 점진적 개선 |

## Project Structure

### Documentation (this feature)

```text
specs/007-oauth-cli-reauth/
├── spec.md
├── plan.md              # This file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── cli-auth-api.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── token-helpers.ts      # NEW — 공유 PAT 생성 헬퍼
│   ├── auth-helpers.ts        # 기존 — 변경 없음
│   └── prisma.ts              # 기존 — 변경 없음
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── cli/
│   │   │   │   └── route.ts   # NEW — CLI 인증 라우트
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts   # 기존 — 변경 없음
│   │   └── tokens/
│   │       └── route.ts       # MODIFY — createPAT 헬퍼 사용
│   └── auth/
│       └── signin/
│           └── page.tsx       # 기존 — 변경 없음
├── middleware.ts               # 기존 — 변경 없음 (API 라우트 통과)

mcp/
└── trip_mcp/
    └── web_client.py          # MODIFY — 재인증 로직 추가

scripts/
└── install.sh                 # MODIFY — 브라우저 인증 통합

tests/
├── api/
│   └── cli-auth.test.ts       # NEW
├── unit/
│   └── test_web_client_reauth.py  # NEW
└── middleware.test.ts         # MODIFY
```

**Structure Decision**: 기존 프로젝트 구조를 유지하며, `src/lib/token-helpers.ts`(공유 헬퍼)와 `src/app/api/auth/cli/route.ts`(인증 라우트)만 신규 추가. MCP 서버와 install.sh는 기존 파일 수정.
