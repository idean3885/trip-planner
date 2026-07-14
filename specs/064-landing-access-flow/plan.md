# Implementation Plan: 대문 접근성·진입 플로우 정비

**Branch**: `064-landing-access-flow` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/064-landing-access-flow/spec.md`

## Summary

로그인 사용자가 대문(`/`)을 볼 수 없던 원인인 `page.tsx`의 로그인 시 `/trips` 강제 리다이렉트를 제거한다. 대문을 로그인·로그아웃 두 상태 모두에서 보이게 하고, 세션 로그인 여부를 `LandingPage`→`Hero`/`BottomCta`로 전파해 주 행동 유도(CTA)와 문구를 상태별로 분기한다. 로그인 후 목적지는 여행 목록으로 고정한다. 중복된 두 소개 섹션(`ValueProps`·`FeatureHighlights`)을 단일 섹션으로 병합하고, 카드 제목 헤딩 시맨틱을 통일한다. 데이터 스키마 변경 없음.

## Coverage Targets

- 로그인 시 대문 리다이렉트 제거 + 세션 여부 전파 [why: landing-access] [multi-step: 2]
- 로그인 후 목적지 여행 목록 고정 [why: login-destination]
- 대문 상태별 CTA·문구 분기 (Hero·BottomCta) [why: state-cta] [multi-step: 2]
- 중복 소개 섹션 단일화 + 카드 헤딩 시맨틱 통일 [why: section-merge] [multi-step: 2]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+
**Primary Dependencies**: Next.js 16 (App Router), React 19, Auth.js v5, Tailwind CSS v4, shadcn/ui (vendored Card·Button). 신규 의존성 없음.
**Storage**: N/A — 데이터 스키마·마이그레이션 변경 없음. 로그인 상태(세션 유무)만 참조.
**Testing**: Vitest + Testing Library (라우팅·표시 로직 회귀 가드). 시각·터치는 실기기 정본.
**Target Platform**: 웹(데스크탑·모바일 단일 반응형)
**Project Type**: Web application (Next.js 풀스택 단일 런타임)
**Performance Goals**: N/A (렌더·라우팅 수준, 신규 부하 없음)
**Constraints**: 웹/모바일 단일 반응형 디자인 유지. 색은 `src/app/globals.css`의 `:root` 팔레트 정본. AI 티·합쇼체 카피 규칙 준수.
**Scale/Scope**: 대문 컴포넌트 4종(page·LandingPage·Hero·BottomCta) + 소개 섹션 병합 + signin 기본 목적지 1곳.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. AX-First**: 대문은 제품 소개 화면으로, AX 흐름(MCP·AI 계획)을 방해하지 않는다. 통합 섹션이 "대화·AI로 계획" 가치를 유지한다. ✅
- **II. Minimum Cost**: 신규 의존성·인프라·비용 0. 기존 컴포넌트 정리·라우팅 조정만. ✅
- **III. Mobile-First Delivery**: 단일 반응형 유지, 뷰포트 분기 설계 없음. 통합 카드 그리드는 기존 반응형 패턴 승계. ✅
- **IV. Incremental Release**: US1(P1)만으로도 독립 배포 가능한 MVP(대문 접근 복구). US2~US4 순차 적용 가능. ✅
- **V. Cross-Domain Integrity**: 도메인(여행·캘린더 등) 데이터 접근 없음. 라우팅·표시 수준이라 크로스 도메인 무관. ✅
- **VI. Role-Based Access Control**: 여행 목록(`/trips`) 로그인 전용 접근을 유지(FR-005). 권한 매트릭스 변경 없음. ✅
- **VII. Calendar Time Model**: 캘린더 시각 표시 로직 미변경. ✅

위반 없음. Complexity Tracking 불필요.

## Project Structure

### Documentation (this feature)

```text
specs/064-landing-access-flow/
├── plan.md              # 본 파일
├── research.md          # Phase 0 산출
├── data-model.md        # Phase 1 산출 (스키마 무변경 명시)
├── quickstart.md        # Phase 1 산출 (Evidence)
├── contracts/           # Phase 1 산출 (라우팅·CTA UI 계약)
├── checklists/
│   └── requirements.md  # spec 품질 체크리스트 (완료)
└── tasks.md             # Phase 2 산출 (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── page.tsx                       # 로그인 리다이렉트 제거 + isLoggedIn 전파
│   ├── layout.tsx                     # 로고 href="/" (확인만, 변경 최소)
│   ├── auth/signin/page.tsx           # redirectTo 기본값 "/" → "/trips"
│   └── middleware.ts (src/middleware.ts) # 확인만 (기존 가드 유지)
├── components/landing/
│   ├── LandingPage.tsx                # isLoggedIn prop 수용·전파, 통합 섹션 반영
│   ├── Hero.tsx                       # 상태별 CTA 분기
│   ├── BottomCta.tsx                  # 상태별 CTA + 본문·헤딩 분기
│   ├── ValueProps.tsx                 # 병합 대상(제거 또는 통합 컴포넌트로 흡수)
│   └── FeatureHighlights.tsx          # 병합 대상(통합 섹션의 뼈대)
└── lib/
    └── landing-content.ts             # 통합 카드 데이터 정리(중복 제거·고유 항목 보존)

tests/ (기존 위치 규약 따름, __tests__ 혹은 *.test.tsx)
└── 라우팅·상태별 CTA·섹션 단일화 회귀 테스트
```

**Structure Decision**: 기존 Next.js App Router 단일 프로젝트 구조 유지. 대문 관련 컴포넌트(`src/components/landing/*`)와 진입 라우팅(`src/app/*`)에 국한.

## Design Decisions (UX 리뷰 반영)

- **세션 전파 경로**: `page.tsx`는 이미 서버에서 `auth()`를 호출한다. 리다이렉트 대신 `isLoggedIn` boolean을 `LandingPage`에 넘기고, `LandingPage`가 `Hero`·`BottomCta`에 전달한다. 모두 서버 컴포넌트로 유지(클라이언트 세션 훅 불필요).
- **상태별 CTA**:
  - 로그아웃 — 주 CTA `시작하기` → `/auth/signin?callbackUrl=/trips` (현행 유지)
  - 로그인 — 주 CTA `여행 목록으로` → `/trips`
  - Hero·BottomCta 양쪽에 적용. BottomCta 본문의 "1초 로그인" 문구는 로그인 상태에서 이어가기 문구로 대체.
- **섹션 병합**: `FeatureHighlights`의 구체 불릿을 뼈대로, `ValueProps`의 혜택 헤드라인 톤을 합쳐 단일 섹션 4카드. 헤딩 "여행 준비를 이렇게 돕습니다". 고유 항목(3계층 관리·현지 시간·Apple 캘린더·한 줄 설치·통화 합산) 보존. 카드 제목은 `h3`로 통일. `LandingPage` 구성에서 중복 컴포넌트 하나 제거.
- **로고**: `layout.tsx`의 `href="/"`는 이미 대문 지향. 리다이렉트 제거로 로그인 사용자 클릭 시 대문 도달이 자동 성립하므로 별도 변경 최소.

## Out of Scope (UX 리뷰 지적, 별도 처리)

`GcalTestingNotice` 하드코딩 색·정렬, 로그아웃 시 헤더 로그인 진입점 부재, 버튼 터치 타깃(32/28px), DemoShowcase 로그인 사용자 노이즈. 본 피처 범위 밖 — 후속 이슈 검토.

## Complexity Tracking

위반 없음 — 해당 없음.
