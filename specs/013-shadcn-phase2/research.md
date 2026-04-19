# Research: shadcn/ui Phase 2 — 복합 컴포넌트 + 레거시 유틸리티 제거

**Feature**: `013-shadcn-phase2`
**Date**: 2026-04-19
**Status**: Complete (모든 NEEDS CLARIFICATION 해소)

## R-1: 복합 컴포넌트 3종의 shadcn 매핑 전략

**Decision**: `ActivityCard`·`ActivityList`·`DayEditor` 외곽은 shadcn `<Card>` + `<CardHeader>`/`<CardContent>`/`<CardFooter>` 조합으로 재구성. 활동 폼 영역은 기존 `ActivityForm`(Phase 1 완료)을 그대로 embed. `ActivityList`는 카드 리스트 컨테이너이므로 `<Card size="sm">`를 반복.

**Rationale**:
- shadcn `<Card>`는 `data-size`(sm/default) 단일 축만 제공하므로 현 레거시 `rounded-card`/`shadow-card` + `p-5` 조합과 의미상 1:1 대응.
- `CardHeader`가 `CardTitle`/`CardAction` 슬롯을 제공하여 기존 "제목 + 우측 액션 버튼" 레이아웃을 추가 CSS 없이 대체 가능.
- `DayEditor`의 폼 영역은 shadcn `<Field>` · `<Label>` · `<Input>`으로 대체(이미 Phase 1에서 6종 확보).

**Alternatives considered**:
- 자체 `Card` 래퍼 신설: shadcn vendored 원칙과 충돌. 기각.
- Radix Primitives 직접 사용: shadcn 추상화 레이어 우회. 향후 shadcn 업데이트 수용성 저하. 기각.

**작업 순서**: `ActivityCard`(단일 카드) → `ActivityList`(카드 배열) → `DayEditor`(카드 + 폼 복합) 순으로 난이도 오름차순 진행. 각 단계 독립 PR.

## R-2: 레거시 유틸리티 제거 검증 게이트

**Decision**: 3단 게이트로 검증.

1. **빌드 단계**: `design/tokens.json`에서 레거시 토큰(`--color-primary-{50..900}` 숫자 스케일, `--color-surface-*`, `--shadow-card*`, `--radius-card`, `--text-heading-*`, `--text-body-*`)을 제거하면 `@theme` 블록에서 자동 사라짐 → 해당 유틸리티가 **Tailwind에서 해석 불가** 상태가 되어 빌드 단계에서 자연 차단.
2. **CI 단계**: `pnpm run check:legacy-utilities` 신규 스크립트. `grep -rn "rounded-card\|shadow-card\|bg-primary-[0-9]\|text-surface-\|text-heading-\|text-body-" src/ styles/` 실행 후 의도된 예외 경로(스펙 013 "Assumptions"에 열거)를 제외한 결과 0건 조건. 위반 시 CI 실패.
3. **코드 리뷰**: PR description에 "레거시 유틸리티 제거 증거 — 위 스크립트 실행 결과 0건"을 붙여 게이트 완료.

**Rationale**: 단순 검색/치환만으로는 누락 위험. (1) 정본 제거로 구조적 차단, (2) CI 자동화로 회귀 차단, (3) 리뷰 증거로 최종 확인 — 3중 가드.

**Alternatives considered**:
- ESLint custom rule: 현 프로젝트가 Tailwind class 전용 lint 룰을 두지 않음. 도입 비용 대비 효과 낮음. CI grep으로 충분. 기각.
- tailwind-safelist 관리: Tailwind v4는 safelist 메커니즘이 달라짐. 복잡. 기각.

**의도된 예외** (Phase 1에서 승계된 경로):
- `changes/*.md` — 과거 릴리즈 단편(불변 기록)
- `specs/012-shadcn-design-system/**` — 이전 피처 스펙 내 코드 예시
- `docs/audits/**` — 감사 보고서 내 코드 예시(있을 경우)

## R-3: `design/tokens.json` ↔ `@theme` ↔ 사용처 3계층 정합 검증

**Decision**: 기존 `scripts/build-tokens.ts`(Style Dictionary) 출력 + 신규 `scripts/audit-tokens.ts` 보조 스크립트로 양방향 검증.

1. **정본 → 빌드**: `pnpm run tokens:build` 실행 후 `globals.css`의 BEGIN:tokens/END:tokens 블록이 결정적으로 갱신되는지 `git diff`로 확인.
2. **빌드 → 사용**: `scripts/audit-tokens.ts`가 `globals.css`의 생성 토큰 이름을 추출하고 `src/**`에서 해당 토큰(utility 클래스 또는 CSS 변수) 사용 횟수를 집계. 0회 사용 = 고아 토큰 → 정본에서 제거.
3. **사용 → 정본**: 같은 스크립트가 `src/**`에서 참조하는 토큰 이름이 `@theme`에 존재하지 않으면 그림자 토큰 → 실패 판정.

**Rationale**:
- 레거시 제거 후에도 "정본에 남았지만 사용되지 않는 토큰"과 "사용되지만 정본에 없는 토큰" 두 방향의 drift를 동시에 차단해야 디자이너 합류 시 편집 효과가 결정적.
- 스크립트 자체는 150줄 이내로 간단 유지(TS + `fast-glob`). 기존 토큰 빌드 인프라 재활용.

**Alternatives considered**:
- Style Dictionary 자체 검증 플러그인: 학습 비용. 기각.
- 수동 점검: 1인 개발 + AI 병렬에서 반복 비용. 기각.

## R-4: #285 로직 보존 + 시각 재작성 분리 전략

**Decision**: PR별로 "로직 영역 = 기존 유지, 스타일 영역 = 재작성" 원칙을 명시하고, 리뷰 시 `git diff --stat`과 행별 diff 검사로 확인.

**영역 구분**:
- **로직 영역(수정 금지)**: 핸들러 함수 정의(`onSubmit`, `onDelete`, `onDragEnd` 등), 서버 액션 호출(`await action(...)`), 상태 관리 훅(`useState`, `useTransition`), Prisma 쿼리, props 시그니처, key prop, 접근성 관련 aria-* 속성 기본 구조.
- **스타일 영역(재작성)**: JSX 최외곽 래퍼 요소, `className` 값, 레이아웃용 flex/grid 유틸리티, 버튼/카드 외곽 컴포넌트 교체(`<div className="...">` → `<Card>...`).

**Rationale**: 동일 파일에서 두 변경이 섞이면 리뷰 난이도 급상승 + 버그 유입 리스크. 복합 컴포넌트별로 **1개 PR = 스타일만**을 엄수하면 rebase/bisect 시 원인 구분이 쉽다.

**Alternatives considered**:
- 파일 전체 rewrite: 로직 누락 리스크 큼. 기각.
- 별도 래퍼 컴포넌트 신설: 기존 import 그래프를 건드리게 되어 파일 스코프가 넓어짐. 기각.

**리뷰 게이트**: 각 복합 컴포넌트 PR description에 "로직 영역 diff 0건 확인" 체크박스 + `git diff origin/develop -- <file>` 스냅샷 요약을 첨부.

## R-5: 카탈로그(`/_dev/components`) 확장 시 샘플 데이터 전략

**Decision**: Phase 2 복합 컴포넌트 카탈로그는 **컴파일 타임 상수**로 mock 데이터를 인라인 작성한다. 실 DB 접근 금지, 환경 변수 의존 0.

**Rationale**:
- `/_dev/components`는 디자이너 검수 전용이며 인증·DB 없이 즉시 렌더돼야 함(스펙 012 결정 승계).
- Mock 데이터는 `specs/013-shadcn-phase2/contracts/component-api.md`에 샘플 시드를 명시. 카탈로그 페이지는 이를 TS 상수로 import만 함.
- 컴포넌트 Props에 `sample` 또는 `preview` 플래그를 도입하지 않음(프로덕션 오염 방지).

**Alternatives considered**:
- Storybook 도입: 신규 도구·빌드 파이프라인 필요. 스펙 012에서 이미 카탈로그 방식으로 갈림. 기각.
- 실 DB 쿼리: 인증/환경 의존. dev-only 경로 오염. 기각.

**프로덕션 제외 규약**: 스펙 012 Phase 0 R-4에서 결정된 `/_dev/*` 경로 제외 설정(Next.js middleware 또는 production 빌드 제외 규칙)을 그대로 승계. 본 피처에서 추가 변경 없음.

## 해소된 NEEDS CLARIFICATION

스펙 013에는 `[NEEDS CLARIFICATION]` 마커 0건이었고, 본 research 단계에서 신규로 드러난 불확실성도 없음. 남은 불확실성은 모두 **Phase 3 이후** 범위로 명시 분리됨(디자이너 합류 후 재검토 항목).
