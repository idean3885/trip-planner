# Implementation Plan: 풀스택 전환

**Branch**: `004-fullstack-transition` | **Date**: 2026-04-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-fullstack-transition/spec.md`

## Summary

현재 정적 여행 플래너(GitHub Pages, Next.js static export)를 Vercel + Next.js SSR + Auth.js v5 + Neon Postgres + Prisma 기반 동적 웹앱으로 전환한다. 소셜 로그인(Google OAuth2), 데이터베이스, 팀 기능(초대/조인/권한)을 추가하여 동행자가 직접 일정을 편집할 수 있게 한다.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+
**Primary Dependencies**: Next.js 15 (App Router), Auth.js v5 (next-auth@5.x), Prisma, @auth/prisma-adapter, @neondatabase/serverless
**Storage**: Neon Postgres (Vercel Marketplace 통합, 무료 티어 0.5GB)
**Testing**: 수동 E2E (quickstart.md 시나리오 기반)
**Target Platform**: Vercel Hobby 플랜 (SSR)
**Project Type**: 풀스택 웹앱 (FE + API Routes + DB)
**Performance Goals**: 소셜 로그인 후 3초 이내 여행 목록 표시
**Constraints**: Vercel Hobby 무료 한도 (함수 100만/월, 4 CPU-hr/월), Neon 0.5GB, 사용자 10명 이내
**Scale/Scope**: 1~2건 여행, 사용자 10명 이내
**Authentication**: Auth.js v5, JWT 세션 전략, split-file 패턴 (Edge 호환)
**Distribution**: Vercel 자동 배포 (git push → 빌드 → 배포)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 검증 | 결과 |
|------|------|------|
| **I. AX-First** | Phase 1의 AI 에이전트 플래닝 워크플로우는 별도 도구(MCP, 캘린더)로 유지. Phase 2는 사용자가 직접 편집하는 웹앱 추가. AI 에이전트 기능을 대체하지 않고 보완 | PASS |
| **II. Minimum Cost** | Vercel Hobby 무료, Neon 무료 티어, Auth.js 오픈소스(MIT), Google OAuth 무료. 추가 비용 없음 | PASS |
| **III. Mobile-First Delivery** | 기존 모바일 단일 디자인 유지 (FR-013). 디자인 토큰 시스템 활용 | PASS |
| **IV. Incremental Release** | US 우선순위(P1→P2)로 점진 릴리즈. 인증 → CRUD → 팀 기능 순서 | PASS |

**Post-Design Re-check**: 모든 원칙 PASS.

## Project Structure

### Documentation (this feature)

```text
specs/004-fullstack-transition/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/                        # Next.js App Router
│   ├── api/
│   │   ├── auth/[...nextauth]/ # Auth.js 핸들러
│   │   ├── trips/              # Trip CRUD API Routes
│   │   └── invitations/        # 초대 수락 API
│   ├── auth/                   # 로그인/에러 페이지
│   ├── invite/[token]/         # 초대 수락 페이지
│   ├── trips/[slug]/           # 여행 상세 (기존 + 편집 기능)
│   │   └── day/[num]/          # 일별 일정 (기존 + 편집 기능)
│   ├── page.tsx                # 홈 (여행 목록, 로그인 필요)
│   ├── layout.tsx              # 루트 레이아웃 (세션 프로바이더)
│   └── globals.css             # 디자인 토큰 (기존)
├── components/
│   ├── TodayButton.tsx         # 기존 유지
│   ├── ScrollToTop.tsx         # 기존 유지
│   ├── AuthButton.tsx          # 로그인/로그아웃 버튼
│   ├── TripForm.tsx            # 여행 생성/편집 폼
│   ├── DayEditor.tsx           # 일정 텍스트 편집기
│   └── TeamManager.tsx         # 팀원 관리 (초대/권한/제거)
├── lib/
│   ├── trips.ts                # 기존 마크다운 유틸 (마이그레이션용 보존)
│   └── prisma.ts               # Prisma 클라이언트 싱글톤
├── auth.ts                     # Auth.js 서버 인스턴스 (Prisma 어댑터)
├── auth.config.ts              # Auth.js Edge 설정 (프로바이더, 콜백)
├── middleware.ts               # 보호 라우트 (비로그인 차단)
├── travel_mcp/                 # Phase 1 MCP 서버 (별도 유지)
└── feedback_mcp/               # Phase 1 피드백 MCP (별도 유지)

prisma/
├── schema.prisma               # DB 스키마 (Auth.js + App 모델)
└── migrations/                 # 마이그레이션 히스토리

scripts/
├── migrate-markdown.ts         # 마크다운 → DB 마이그레이션 스크립트
├── install.sh                  # Phase 1 MCP 설치 (기존 유지)
└── ...                         # 기존 스크립트 유지
```

**Structure Decision**: 기존 Next.js App Router 구조를 유지하면서 API Routes, Auth, Prisma를 추가한다. Phase 1 MCP 서버(travel_mcp, feedback_mcp)는 별도 모듈로 그대로 보존한다. BE 로직은 API Routes + Server Actions에 배치한다.

## 구현 단계

### Phase 1: 인프라 전환

1. **Vercel 배포 전환**: `output: "export"` 제거, Vercel 프로젝트 생성, trip.idean.me 도메인 재연결
2. **DB 설정**: Neon Marketplace 통합, Prisma 스키마 작성(Auth.js 표준 + App 모델), 초기 마이그레이션
3. **Prisma 클라이언트**: lib/prisma.ts 싱글톤 패턴

### Phase 2: 인증

4. **Auth.js 설정**: auth.config.ts (Edge), auth.ts (서버 + Prisma 어댑터), middleware.ts (보호 라우트)
5. **Google OAuth**: 환경변수 설정, 콜백 URL 등록
6. **로그인 UI**: 로그인 페이지, AuthButton 컴포넌트, 세션 상태 표시

### Phase 3: 데이터 마이그레이션 + CRUD

7. **스키마 마이그레이션**: TripMember(HOST/GUEST), Trip.createdBy/updatedBy 반영, prisma migrate dev
8. **마이그레이션 스크립트**: trips/ 마크다운 → DB (Trip + Day + TripMember(HOST) 레코드 생성)
9. **데이터 소스 전환**: lib/trips.ts (파일 읽기) → Prisma 쿼리로 교체
10. **Trip CRUD**: API Routes (생성/조회/수정/삭제) + TripMember 기반 권한 검증
11. **Day CRUD**: API Routes (추가/조회/수정/삭제) + 하루 단위 텍스트 편집기

### Phase 4: 팀 기능 + 권한 모델

12. **OWNER 역할 추가**: TripRole에 OWNER 추가, 스키마 마이그레이션, 기존 HOST 데이터 OWNER로 보정
13. **게스트 읽기 전용**: 게스트 편집 차단 (API 403 + UI 비활성화)
14. **초대 시스템**: JWT 토큰 기반 초대 링크 생성, 초대 수락 페이지, TripMember 레코드 생성 (호스트/게스트 역할 지정, 이메일 입력 불필요)
15. **동행자 관리 UI**: 멤버 목록, 승격(게스트→호스트), 강등(호스트→게스트, 주인만), 제거, 자발적 탈퇴
16. **주인 양도**: 주인→호스트에게 양도 API + UI
17. **여행 삭제 보호**: 주인만 삭제 가능 + 확인 대화상자
18. **접근 제어 강화**: API 레벨 3단계 권한 검증 (비멤버 403, 게스트 편집 차단, 주인 전용 기능)

### Phase 5: 검증

19. **quickstart.md 시나리오 전수 검증**: QS1~QS5 + Edge Case EC1~EC3
20. **모바일 확인**: trip.idean.me에서 모바일 UI 정상 동작 확인
