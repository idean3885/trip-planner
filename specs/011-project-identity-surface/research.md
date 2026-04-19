# Phase 0: Research — 프로젝트 아이덴티티 표면

**Feature**: 011-project-identity-surface
**Date**: 2026-04-19

Spec의 Clarifications·Assumptions로 대부분의 모호점은 이미 봉합됐다. 본 문서는 구현 수단 선택과 그 근거를 기록한다. `NEEDS CLARIFICATION`은 없다.

## R-1. 메타 소스 형식: TypeScript 상수 모듈 (`as const`)

**Decision**: `src/lib/project-meta.ts`에 `export const projectMeta = { ... } as const satisfies ProjectMeta;` 형태로 정의. 타입은 동일 파일에서 `export type ProjectMeta = { name: string; author: string; githubUrl: string; license: string; description: string; techStack: readonly string[]; }`로 명시.

**Rationale**:
- 빌드 시점 정적 검사. 필수 필드 누락 시 `tsc`가 바로 실패(spec SC-006 충족).
- JSON 또는 env 변수 대비 import 경로가 명확하고 IDE 자동완성·go-to-definition 지원.
- `as const` + `satisfies`로 리터럴 타입 좁히기 + 스키마 검증 동시 획득.

**Alternatives considered**:
- `project-meta.json` + zod 검증: 런타임 검증 레이어가 추가돼 IV(점진적 릴리즈)·비용 원칙에 비해 과잉.
- `package.json` 필드 재활용: 다른 팀원·도구가 `package.json`을 수정할 때 UI까지 함께 바뀌는 부작용. 앱 아이덴티티와 패키지 메타는 목적이 다르므로 분리.
- `.env` 변수: 런타임 의존성 생성, 타입 안전성 약함, 빌드 시점 감지 어려움.

## R-2. 풋터 배치 전략: 서버 컴포넌트 + 루트 레이아웃 flex column

**Decision**: `src/components/Footer.tsx`를 기본 서버 컴포넌트로 작성. `src/app/layout.tsx`의 `<body>`를 `className="... min-h-screen flex flex-col"`로 변경, 기존 메인 콘텐츠 래퍼에 `flex-1`을 적용한 뒤 `<Footer />`를 그 아래에 둔다.

**Rationale**:
- 서버 컴포넌트로 작성하면 클라이언트 번들에 추가되는 JS 0바이트(spec Performance Goals 충족).
- flex column + flex-1 패턴은 브레이크포인트 분기 없이 모든 뷰포트에서 콘텐츠가 짧아도 풋터가 하단에 고정(spec FR-011).
- 추가 CSS 파일 불요. 프로젝트의 Tailwind 규약과 정합.

**Alternatives considered**:
- `position: sticky`/`fixed`: 짧은 콘텐츠에서 빈 여백 또는 겹침 발생. flex column이 문법·시각 모두 깔끔.
- 클라이언트 컴포넌트로 작성: Link 컴포넌트만 쓸 예정이므로 "use client" 불필요. 서버 컴포넌트가 기본값이어야 함.

## R-3. 반응형 단일 레이아웃: flex-wrap

**Decision**: 풋터는 `flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-6 text-sm`로 항목을 가로 배치. 가로 폭이 줄면 자동 wrap. About 페이지는 `max-w-2xl mx-auto px-4 py-10`의 세로 단일 컬럼.

**Rationale**:
- spec FR-009 "브레이크포인트 분기 금지"를 충족. flex-wrap은 viewport meta queries 없이 가로 공간에 따라 자동 조정.
- 375px(모바일)에서는 3~4개 항목이 2줄로, 1280px(데스크톱)에서는 한 줄로 자연 배치.

**Alternatives considered**:
- `md:flex-row`, `sm:block` 같은 Tailwind 브레이크포인트 사용: 원칙 위배.
- CSS Grid `grid-template-columns: repeat(auto-fit, ...)`: 유효하지만 flex-wrap이 더 간결하고 디자인 의도 명확.

## R-4. 외부 링크 아이콘: 인라인 유니코드 "↗"

**Decision**: "GitHub ↗", "API Docs ↗"처럼 텍스트 뒤에 유니코드 `↗` (U+2197) 직접 포함. `aria-label` 또는 시각적 보조 없이 링크 자체의 텍스트로 의미 전달.

**Rationale**:
- `lucide-react` 같은 아이콘 라이브러리가 프로젝트에 미채택 상태. 추가 의존성은 II(비용) 원칙에 비춰 불필요.
- 유니코드 화살표는 모든 폰트에서 렌더 가능, 시각 장애인 스크린 리더도 "위쪽 오른쪽 화살표"로 읽음(적절한 의미 전달).

**Alternatives considered**:
- SVG 인라인: 유지보수 대비 가독성 손해. 유니코드로 충분.
- `lucide-react`: 패키지 크기 + 빌드 시간 증가. 한 아이콘을 위해 도입할 가치 없음.

## R-5. About 페이지 콘텐츠 구조

**Decision**: `/about` 페이지는 세로 단일 컬럼으로 4개 섹션 구성:

1. 프로젝트 이름 + 한 줄 설명 (h1 + p)
2. 배경 설명 (1-2문단)
3. 저작자·라이선스·GitHub 링크 (dl 또는 키-값 리스트)
4. 기술 스택 요약 (ul)

모든 값은 `projectMeta`에서 읽어온다. 하드코딩 금지(spec FR-003).

**Rationale**:
- 단일 컬럼 = 모바일에서 가로 스크롤 불필요(spec SC-004).
- 섹션 헤더 없이도 의미 전달 가능한 최소 구조. 추후 확장 여지만 두고 현재는 심플.

**Alternatives considered**:
- 다단 그리드(저작자·라이선스·GitHub를 카드로 나열): 모바일에서 세로 쌓이는 반응형 필요 → 원칙 위배.

## R-6. 설정 페이지 API 문서 링크 위치

**Decision**: `src/app/settings/page.tsx` 상단(페이지 제목 바로 아래 또는 옆)에 `<Link href="/docs">API 문서 →</Link>` 1개 요소 추가. 새 섹션·새 컴포넌트 도입 없이 현행 파일만 편집.

**Rationale**:
- spec US3(P3)는 "진입점 강화"이지 새 UX 흐름 도입이 아니다. 최소 코드 변경.
- 기존 페이지 구조 존중. 새 파일 생성은 IV(점진적)·복잡도 억제 원칙에 비춰 과잉.

**Alternatives considered**:
- 별도 `SettingsHeader` 컴포넌트 추출: 현재는 설정 페이지 하나뿐, YAGNI.

## R-7. 단일 소스 일관성 검증 방법

**Decision**: `projectMeta` 필드 중 UI에 노출되는 값은 About·풋터 양쪽이 "import 경로가 동일한 상수"라는 것을 코드 리뷰에서 확인. 별도 테스트 없이도 타입 시스템이 drift를 막는다(동일 상수 참조이므로 값 차이 발생 불가능).

**Rationale**:
- 단일 import이므로 SC-003(풋터·About 필드 100% 일치)는 구조적으로 보장됨. 추가 테스트는 중복.

**Alternatives considered**:
- 컨트랙트 테스트 추가: 상수 참조 구조상 불필요한 과잉 검증.

---

모든 결정은 spec의 FR·SC·Clarifications와 정합한다. Phase 1 산출물(data-model, contracts, quickstart)은 본 연구 기반으로 작성한다.
