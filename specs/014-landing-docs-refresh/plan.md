# Implementation Plan: 공개 랜딩 페이지 & 문서 체계 개편

**Branch**: `014-landing-docs-refresh` | **Date**: 2026-04-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-landing-docs-refresh/spec.md`

## Summary

현재 `/`는 로그인 필수 대시보드여서 비로그인 방문자(채용 담당자·동료 개발자)가 프로젝트를 파악할 수단이 없다. 본 피처는 **`/`를 공개 랜딩 페이지로 재정의**하여 포트폴리오 공개 면을 만들고, **README·docs/ 를 독자 3층(외부 방문자 / 기여자·개발자 / 운영·감사) 그룹**으로 재구성하여 외부 진입 동선을 명확히 한다. 기존 대시보드 UI(여행 목록)는 `/trips`로 이관한다. 루트 디렉터리의 명백한 레거시(02_honeymoon_plan.md, Jekyll 잔재)는 선택·후순위 트랙으로 분리해 안전 검증 후 제거한다.

기술 접근: Next.js 16 App Router의 공개 페이지로 `/`를 재구성하고, `auth.config.ts`·`middleware.ts`의 공개 경로 판정에 `/`를 추가한다. 랜딩 콘텐츠는 shadcn Phase 2 이후의 토큰·컴포넌트를 그대로 재사용하며(신규 의존성 0), 반응형 단일 디자인 원칙을 유지한다. 데모는 정적 스크린샷으로 시작한다.

## Coverage Targets

- `/` 공개 라우트 전환 및 대시보드 이관 [why: landing-route] [multi-step: 2]
- 랜딩 콘텐츠 섹션 구성(hero/values/features/tech-stack/demo/CTA/footer) [why: landing-content] [multi-step: 4]
- 디자인 시스템(shadcn 토큰·컴포넌트) 일관 적용 [why: landing-ds]
- 랜딩 접근성·JS 비활성·SEO 기본 [why: landing-a11y]
- README 리팩토링(링크 중복 제거 + 3층 독자 진입점) [why: readme-refresh] [multi-step: 2]
- docs/ 엔트리(독자 3층 그룹 목차) 신설 [why: docs-entry]
- 각 docs 문서 상단에 대상 독자 명시 [why: docs-reader-tag] [multi-step: 2]
- docs 중복·역할 겹침 문서 통합 또는 포인터화 [why: docs-dedup]
- 루트 레거시 파일 safe 제거(선택) [why: root-legacy]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+
**Primary Dependencies**: Next.js 16 (App Router · Turbopack), React 19, Tailwind CSS v4(`@theme` CSS-first), shadcn/ui(vendored), Radix UI primitives(필요분), `class-variance-authority`, `tailwind-merge`, `clsx`, `lucide-react`, `tailwindcss-animate`, Style Dictionary v4. **본 피처에서 신규 의존성 도입 없음** — 013 Active Technologies 승계.
**Storage**: N/A (UI·문서 피처. 영속 데이터 스키마 변경 없음).
**Testing**: Vitest (단위/컴포넌트) + Playwright (e2e). 랜딩은 e2e 주도.
**Target Platform**: Vercel (Next.js 웹앱 SSR/SSG), 공개 배포. 모바일 브라우저 포함.
**Project Type**: web-service (단일 Next.js 앱 + Python MCP 서버는 별도 서브트리로 공존).
**Performance Goals**: Lighthouse 접근성 ≥ 90 (SC-007), 반응형 레이아웃 깨짐 0 (SC-006), 비로그인 `/` 응답 오류·리디렉트 0 (SC-005).
**Constraints**:
- 반응형 단일 디자인(웹/모바일 동일 레이아웃, 분기 없음) — 기존 프로젝트 원칙 유지.
- 기존 인증 가드가 `/`를 막지 않도록 공개 경로로 허용 — `middleware.ts`의 `isPublicRoute` 판정에 `/` 추가.
- 직전 디자인 시스템 마이그레이션(v2.5.0 shadcn Phase 2)의 토큰·컴포넌트와 시각 언어 일관.
- JS 비활성 환경에서도 핵심 소개 텍스트·링크 읽힘 — 과도한 클라이언트 전용 처리 지양.
**Scale/Scope**: 단일 랜딩 페이지 1개 + 최소 1컷 데모 스크린샷 + README 1개 + `docs/` 10종 문서 재구성(대상 독자 명시 · 엔트리 신설 · 중복 정리) + 루트 레거시 1~3개 safe 제거(선택).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 적합성 | 근거 |
|------|--------|------|
| I. AX-First | ✅ Pass | 랜딩은 AX 입구 역할. AI 에이전트(MCP) 설치/활용 안내가 주요 섹션으로 포함되며, 웹 UI는 AX 산출물 확인·수정 보조 면으로 소개. |
| II. Minimum Cost | ✅ Pass | 신규 패키지·외부 API·유료 서비스 도입 없음. Vercel Hobby + 기존 자산만 사용. |
| III. Mobile-First Delivery | ✅ Pass | FR-LA-009·SC-006으로 웹/모바일 단일 반응형 디자인 요구. |
| IV. Incremental Release | ✅ Pass | v2.6.0 독립 릴리즈. 기존 대시보드(`/trips`) 기능 보존. `/`의 역할만 교체. |
| V. Cross-Domain Integrity | ✅ Pass | 본 피처는 Trip/Day/Activity 데이터에 손대지 않음. 공개 면 UI·문서만 다룸. |
| VI. Role-Based Access Control | ✅ Pass | 랜딩은 공개(비로그인) 경로. 기존 권한 매트릭스에 새 행위 추가 없음. 로그인 사용자의 `/` → `/trips` 전환은 기존 OWNER/HOST/GUEST 권한과 무관한 단순 라우팅. |

**결론**: Violations 없음. Complexity Tracking 생략.

## Project Structure

### Documentation (this feature)

```text
specs/014-landing-docs-refresh/
├── plan.md                # This file
├── research.md            # Phase 0 output
├── data-model.md          # Phase 1 output (콘텐츠 스키마)
├── quickstart.md          # Phase 1 output (Evidence 체크리스트)
├── contracts/             # Phase 1 output (라우트 공개/리디렉트 계약)
├── checklists/
│   └── requirements.md    # 스펙 품질 체크리스트 (specify 단계 산출)
└── tasks.md               # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── page.tsx                       # [수정] `/` — 로그인 분기: 비로그인=랜딩 렌더, 로그인=`/trips` 리디렉트
│   ├── about/page.tsx                 # [유지] 기존 소개. 랜딩과 역할 분담(research.md R1)
│   ├── trips/                         # [확장 가능] 대시보드(현 `/` 내용) 이관처
│   ├── layout.tsx                     # [수정 가능] 공개·비공개 공통 레이아웃 분기(최소 변경)
│   └── (기타 기존 라우트)
├── components/
│   └── landing/                       # [신설] 랜딩 전용 섹션 컴포넌트 (Hero / ValueProps / FeatureHighlights / TechStack / DemoShowcase / CTA / LandingFooter)
├── middleware.ts                      # [수정] isPublicRoute 판정에 `/` 포함
├── auth.config.ts                     # (대개 수정 불필요)
└── lib/
    └── project-meta.ts                # [활용] 랜딩이 재사용 (기존 about이 이미 사용)

public/
└── landing/                           # [신설] 랜딩 데모 스크린샷 자산(모바일·데스크톱 1~2컷)

README.md                              # [수정] 히어로 정돈 + 3층 독자 섹션
docs/
├── README.md                          # [신설] 독자 3층 그룹 엔트리(목차)
├── ARCHITECTURE.md                    # [수정] 상단에 대상 독자 한 줄
├── DEVELOPMENT.md                     # [수정] 동일
├── DOMAIN.md                          # [수정] 동일
├── ENVIRONMENTS.md                    # [수정] 동일
├── ERD.md                             # [수정] 동일
├── WORKFLOW.md                        # [수정] 동일
├── design-handoff.md                  # [수정] 동일
├── spec.md                            # [수정 또는 통합 대상 — research.md R6]
├── audits/                            # [분류: 운영·감사]
├── evidence/                          # [분류: 운영·감사]
└── research/                          # [분류: 운영·감사]

(루트 레거시 — 선택 트랙, root-legacy)
├── 02_honeymoon_plan.md               # [제거 후보]
├── _config.yml                        # [점검 후보 — Jekyll 잔재]
└── index.md                           # [점검 후보 — Jekyll 잔재]
```

**Structure Decision**: 단일 Next.js 프로젝트(Option 1 변형)를 유지한다. 웹 UI와 MCP 서버는 이미 `src/`와 `mcp/`로 공존 중이며 본 피처는 `src/app` 루트 라우트와 문서만 손댄다. 신규 디렉터리는 `src/components/landing/`, `public/landing/` 두 개로 제한하여 기존 구조 교란을 최소화한다. docs는 파일 이동 없이 "상단 독자 태깅 + 엔트리 목차 추가"로 재구성한다(링크 훼손 최소화).

## Complexity Tracking

*해당 없음 — Constitution Check 모든 원칙 Pass.*
