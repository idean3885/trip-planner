# Implementation Plan: 프로젝트 아이덴티티 표면 구축

**Branch**: `011-project-identity-surface` | **Date**: 2026-04-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-project-identity-surface/spec.md`

## Summary

전역 풋터(모든 페이지 하단)·About 페이지(`/about`)·설정 페이지 API 문서 링크 3종을 추가해 프로젝트 아이덴티티 표면을 구축한다. 프로젝트 메타(이름·저작자·GitHub URL·라이선스·기술 스택)는 `src/lib/project-meta.ts` 단일 상수 모듈에서 노출하고 풋터·About 모두 이 소스만 참조한다. 반응형 분기 없이 모바일 우선 단일 레이아웃으로 구현. US1(풋터)와 US2(About)는 별도 PR로 분할 가능.

## Coverage Targets

- 프로젝트 메타 단일 소스 모듈 정의 [why: meta-source]
- 전역 풋터 컴포넌트 + 루트 레이아웃 통합 [why: footer] [multi-step: 2]
- About 페이지 `/about` 라우트 신설 [why: about-page]
- 설정 페이지 상단에 API 문서 진입 링크 추가 [why: settings-link]
- 풋터·About 모바일/데스크톱 시각 증거 수집 [why: visual-evidence]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+
**Primary Dependencies**: Next.js 15 (App Router), React 19, Tailwind CSS (프로젝트 기존 채택). 추가 npm 의존성 없음 — 아이콘은 유니코드 ↗ 인라인 사용(research R-4 참조).
**Storage**: N/A (정적 상수)
**Testing**: 빌드 단계 타입 검사(`tsc`), 시각 검증은 quickstart의 수동 Evidence + 스크린샷
**Target Platform**: 브라우저(Next.js SSR/RSC) — 모바일 375px, 데스크톱 1280px 기준
**Project Type**: web-application (Next.js 웹앱 + Python MCP 서버 공존)
**Performance Goals**: 추가 런타임 JS 0바이트 수준(순수 서버 컴포넌트), CLS 0에 가까운 sticky footer
**Constraints**: 브레이크포인트 분기 금지(flex-wrap 또는 세로 정렬만), 외부 링크 `rel="noopener noreferrer"` 필수, 메타 필수 필드 누락 시 빌드 실패(런타임 fallback 금지)
**Scale/Scope**: 전 페이지 영향(루트 레이아웃 변경) + 신규 라우트 1개(`/about`) + 기존 설정 페이지 1곳 링크 추가

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 준수 여부 | 검토 |
|------|----------|------|
| I. AX-First | ✅ 해당 없음 | 아이덴티티 표면은 정보성 UI. AI 워크플로우 개입 없음. |
| II. Minimum Cost | ✅ 준수 | 정적 상수 + 기존 Next.js 라우팅. 외부 의존성 추가 없음. |
| III. Mobile-First Delivery | ✅ 핵심 | spec FR-009 "브레이크포인트 분기 금지" — flex-wrap/세로 정렬 단일 레이아웃. |
| IV. Incremental Release | ✅ 준수 | US1(풋터) 단독 배포 가능, US2(About) 별도 PR로 분할. 기존 기능 영향 없음. |
| V. Cross-Domain Integrity | ✅ 준수 | 메타 소스는 앱 아이덴티티 도메인(독립). Trip/Activity/Member 등 기존 도메인에 참조·변경 없음. |
| VI. Role-Based Access Control | ✅ 준수 | 풋터·About은 공개 페이지(인증 불요). 설정 페이지 링크는 모든 로그인 역할(OWNER/HOST/GUEST)에 동일 노출되며 클릭 시 이동만 수행(읽기 전용). 새 권한 행위 추가 없음. |

추가 고려: spec.md FR-010의 "메타 필수 필드 빌드 감지"는 `project-meta.ts`의 타입을 `readonly` + 명시적 타입으로 강제하여 구현한다. 런타임 fallback은 작성하지 않는다.

## Project Structure

### Documentation (this feature)

```text
specs/011-project-identity-surface/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (ProjectMeta shape)
├── quickstart.md        # Phase 1 output (Evidence 포함)
├── contracts/           # Phase 1 output (UI 계약 — 라우트·컴포넌트 공개 인터페이스)
│   └── ui-surface.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx                 # 루트 레이아웃 — Footer 삽입 위치
│   ├── about/
│   │   └── page.tsx               # /about 페이지 (신규)
│   └── settings/                  # 기존 경로 — API 문서 링크 추가 위치 (파일 경로는 현행 유지)
├── components/
│   └── footer/
│       ├── Footer.tsx             # 서버 컴포넌트 (신규)
│       └── Footer.module.css      # 또는 Tailwind 클래스 직접 사용
└── lib/
    └── project-meta.ts            # 단일 메타 상수 (신규)

mcp/                               # 본 피처 범위 외
prisma/                            # 본 피처 범위 외 (마이그레이션 없음)
```

**Structure Decision**: Next.js App Router 단일 앱 구조를 유지. 풋터는 `src/components/footer/Footer.tsx` 서버 컴포넌트로 작성해 루트 `src/app/layout.tsx`에서 `<body>` 말미에 삽입. About 페이지는 `src/app/about/page.tsx` 단일 파일(서버 컴포넌트). 메타 상수는 `src/lib/project-meta.ts`에 타입 명시된 `as const` 객체로 배치. 설정 페이지는 기존 파일의 상단 섹션에 링크만 추가(새 파일 생성 없음). 스타일은 프로젝트의 기존 Tailwind 클래스 규약을 그대로 사용하며 별도 CSS 모듈 도입은 피한다.

## Complexity Tracking

본 피처는 추가 의존성·새 아키텍처 패턴·크로스 도메인 접근 없음. 헌법 위배 없음. 표는 비움.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (해당 없음) | | |
