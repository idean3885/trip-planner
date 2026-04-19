# Phase 0: Research — 디자인 시스템 기반 제정 (012)

**Feature**: 012-shadcn-design-system
**Date**: 2026-04-19

spec의 Clarifications에서 6개 거버넌스 의사결정은 이미 확정. 본 문서는 그 의사결정을 충족하기 위한 **구현 수단 선택의 근거**를 기록한다. `NEEDS CLARIFICATION`은 없다.

## R-1. Tailwind v3 → v4 전환: CSS-first (`@theme`) + `@tailwindcss/postcss`

**Decision**: v3의 `tailwind.config.ts` + `@tailwind base/components/utilities` 3개 지시어를 제거하고, v4의 CSS-first 구성으로 전환한다.

- `postcss.config.mjs`: `tailwindcss` + `autoprefixer` → `@tailwindcss/postcss` 단일 플러그인으로 교체(v4가 autoprefixer 기능을 내장).
- `src/app/globals.css`: 파일 상단에 `@import "tailwindcss";` + `@theme { … }` 블록으로 전체 토큰(색상·간격·타이포·반경·그림자) 이전.
- `tailwind.config.ts`: **삭제**. `content` 스캔 경로는 v4에서 자동 감지로 바뀌므로 수동 선언 불필요.
- `@tailwindcss/typography` 플러그인: v4용 `@plugin "@tailwindcss/typography";` 지시어로 `globals.css`에 재등록.
- 기존 `.prose .table-cards`·`.weather-toggle`·`pre`·`blockquote` 규칙: `@apply`는 유지 가능(v4 호환)하되, 새 토큰 이름(`text-surface-500` 등) 그대로 동작.

**Rationale**:
- shadcn/ui v2.x는 Tailwind v4를 1차 지원하며 `components.json` 초기화가 `@theme` 변수 체계를 가정한다. v3 호환 모드로 가면 shadcn 템플릿이 CSS 변수 교체 시 drift 위험.
- 토큰 단일 소스(=CSS 변수) 원칙(spec FR-001) 충족. `tailwind.config.ts` + CSS 변수 이중 소스 상태를 제거해야 디자이너 DTCG 워크플로우(R-3)와 1:1 매핑 가능.
- v4 공식 마이그레이션 가이드에 `npx @tailwindcss/upgrade` 자동 마이그레이션 도구가 있으나, 본 프로젝트의 tailwind.config.ts는 간단한 팔레트 + 타이포만 포함하므로 **수동 이전**이 더 명확. 자동 도구는 로컬 점검용으로만 참고한다.

**Alternatives considered**:
- **v3 유지 + shadcn v1 포팅**: shadcn v1은 유지보수 축소 상태(최신 컴포넌트 미반영, Radix 버전 고정). 장기 유지비 관점에서 탈락.
- **`@config "./tailwind.config.ts"` 호환 모드**: 전환 속도는 빠르나 토큰이 TS + CSS 두 곳에 분기됨. 디자이너 파이프라인 설계(R-3)와 상충.
- **CSS-in-JS(styled-components 등) 전환**: Next.js 15 RSC와 호환성 리스크 + 전면 재작성 비용. 본 피처 범위 대비 과잉.

**Notes**:
- `globals.css` 기존 라인 수: 145줄. `@theme` 블록 추가 + 지시어 교체로 +30~40줄 예상. 유지보수 가독성 위해 `@theme`·`@plugin`·기존 `.prose` 규칙을 명확히 구분 주석 삽입.
- `postcss.config.mjs`가 `.js`인지 `.mjs`인지 저장소 실물 확인 필요(tasks 단계).
- v2.4.2 트랙의 Next 16 업그레이드(#249)와 Tailwind v4는 독립. 순서는 v2.4.3(본 피처, Tailwind v4) → v2.4.2(Next 16)가 될 수도 있고 반대가 될 수도 있으나, 어느 순서든 v4 + Next 15 또는 v4 + Next 16 조합은 공식 지원. 머지 순서에 따른 회귀만 해당 트랙에서 확인.

## R-2. shadcn/ui 초기 컴포넌트 셋 + 번들 영향

**Decision**: `npx shadcn@latest init`으로 `components.json` 생성 후 다음 11종을 `src/components/ui/`에 vendoring한다.

- **폼 기반**: `button`, `input`, `label`, `form`
- **레이아웃**: `card`
- **오버레이**: `dialog`, `dropdown-menu`, `select`
- **네비게이션**: `tabs`
- **피드백**: `toast`(sonner 기반), `skeleton`

`components.json` 구성:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

**Rationale**:
- 폼 6종 마이그레이션(PR3)이 요구하는 최소 셋 + Phase 2 복합 컴포넌트 재작업 시 자주 쓰일 후보군을 포함. Dialog·DropdownMenu·Select·Tabs·Toast는 기존 자체 작성 UI에 부분적으로 존재하므로 vendoring만 해두면 Phase 2 재작업 비용이 낮아진다.
- `style: "new-york"`: `default` 스타일 대비 간격이 조밀하고 모바일 가독성이 나음. 사내 디자이너 미합류 상태에서 초기 기본값으로 적정.
- `rsc: true`: Next.js 15 App Router. 서버 컴포넌트 기본, `"use client"`는 대화형(Dialog·DropdownMenu 등)에만.
- `baseColor: "slate"`: 기존 `surface` 팔레트가 slate 계열과 호환. @theme에서 `--color-background`, `--color-foreground` 등 shadcn이 요구하는 기본 변수를 `primary`/`surface` 팔레트에서 파생하도록 매핑(R-3 참조).

**번들 영향 추정**(peerDep 제외 실설치):

| 패키지 | 용도 | 추정 설치 크기(압축 해제) |
|--------|------|--------------------------|
| `class-variance-authority` | variants 관리 | ~10 KB |
| `tailwind-merge` | 클래스 병합 | ~30 KB |
| `clsx` | 클래스 조합 | ~2 KB |
| `lucide-react` | 아이콘 | tree-shaking 기준 사용분만 ~5 KB/아이콘 |
| `tailwindcss-animate` | 애니메이션 유틸 | ~8 KB |
| `@radix-ui/react-dialog` 외 N | 접근성 primitives | 컴포넌트당 ~20 KB |

총 러닝 번들은 폼 페이지 기준 +50~80 KB gzip 예상. 기존 자체 Dialog·Dropdown 구현 제거로 상쇄되는 부분이 있어 실질 증분은 더 작을 것. 정확한 수치는 PR2 머지 전 `pnpm build` 결과로 측정하여 quickstart Evidence에 기록.

**Alternatives considered**:
- **Headless UI**: Radix 대비 접근성 커버리지 낮음. shadcn 템플릿 생태계가 Radix 기준.
- **NextUI/HeroUI**: 외부 종속. spec 의사결정(코드 vendoring) 위배.
- **초기 셋을 button/input/label/form 4종으로 최소화**: PR2 단독은 편하지만 PR3 마이그레이션 중 추가가 필요해 작업이 분절됨. 11종 일괄 vendoring이 체감 편익이 크다.

## R-3. Style Dictionary 토큰 파이프라인

**Decision**: `design/tokens.json`(W3C DTCG 형식) → `scripts/build-tokens.ts` → `src/app/globals.css`의 `@theme` 블록 생성. `package.json`에 `"tokens:build": "tsx scripts/build-tokens.ts"` 스크립트 추가.

파이프라인:

1. 디자이너가 Tokens Studio plugin(Figma)에서 토큰 export → `design/tokens.json` 갱신 커밋.
2. 개발자가 `pnpm run tokens:build` 실행 → Style Dictionary가 파싱 → `src/app/globals.css`의 `/* BEGIN:tokens */` … `/* END:tokens */` 블록 내부를 재작성(파일의 나머지 `@theme` 수동 주석·기존 `.prose` 규칙·`@plugin`은 보존).
3. `git diff`로 CSS 변화 확인 후 PR로 반영.

**Rationale**:
- `design/tokens.json`을 앱 소스(`src/`) 밖에 두는 이유: 디자이너 편집·빌드 입력이라는 역할 분리를 파일 경로로 가시화. 런타임 코드와 무관.
- `@theme` 블록 "안쪽"만 재생성하는 이유: 기존 legacy CSS(`.prose .table-cards` 등)를 자동 재생성으로 덮지 않기 위해. Sentinel 주석으로 구간 분리.
- Style Dictionary는 v4(2024+) 기준 ESM + TS 지원이 성숙. Node 20+에서 `tsx`로 직접 실행 가능해 빌드 래퍼 불필요.
- 빌드 실패 조건(spec FR-009): `tokens.json` 누락·스키마 위반 시 Style Dictionary가 에러 종료 → 스크립트가 zero-length CSS 블록을 쓰지 않도록 예외 처리 명시.

**Alternatives considered**:
- **수기 CSS 편집**: 디자이너가 CSS 문법을 알아야 함 + 파일 drift 검증 없음. 장기적으로 협업 병목.
- **Token Transformer(Tokens Studio 자체 플러그인 빌드)**: Figma 안에서 CSS 재생성 가능하나 Git 워크플로우 바깥. 개발자 게이트(spec Clarifications #4) 원칙에 상충.
- **Vite/webpack 로더에 토큰 파싱 훅**: Next.js 빌드 파이프라인에 끼워넣으면 빌드 시마다 재생성되어 Git 이력 추적 어려움. 명시적 스크립트가 더 명확.

**Notes**:
- 첫 커밋 시 `design/tokens.json`은 현행 `tailwind.config.ts`의 팔레트를 1:1 복제하여 시드. 이후 디자이너가 편집.
- DTCG 스키마 검증기(`@design-tokens/dtcg-validator` 같은 외부 패키지)는 **도입 보류**. Style Dictionary가 파싱 시점에 기본 검증을 수행하므로 초기엔 충분. 6개월 운영 후 필요성 재평가.

## R-4. 미리보기 경로 `/_dev/components` dev-only 전략

**Decision**: Next.js App Router의 경로명 `_dev`를 그대로 사용하되, **루트 라우트 파일 내부에서 `process.env.NODE_ENV === "production"`이면 `notFound()` 호출**로 프로덕션 접근을 차단한다.

```tsx
// src/app/_dev/components/page.tsx
import { notFound } from "next/navigation";

export default function DevComponentsPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return <CatalogGrid />;
}
```

**Rationale**:
- App Router는 `_` 접두어 디렉토리를 "private folder"로 취급해 **라우트로 자동 노출되지 않는다**. 따라서 `/_dev/components`는 그 자체로는 라우트가 되지 않음.
- 라우트로 노출하려면 `(group)` 네이밍이나 명시적 경로 매핑이 필요한데, 본 피처는 그 반대로 "개발에서만 보고 싶다"이므로 일반 폴더명 `_dev` 유지 + `notFound()` 이중 차단.
- 잘못 사용하면 Next가 경로를 찾지 못할 수 있으므로 실제 구현 시 **경로명은 `(dev)/components`로 바꾸고** 프로덕션 `notFound()` 패턴을 적용하는 방안도 검토(tasks 단계에서 실증).

**Alternatives considered**:
- **Storybook 도입**: 1인 개발자 + 디자이너 1인 규모에서 Storybook 설정·유지 비용이 값어치보다 큼. Phase 2 이후 재평가.
- **별도 레포/사이트**: 컴포넌트 vendoring 경로(`src/components/ui`)와 동기화 부담. 같은 레포에 유지가 비용 최소.
- **`middleware.ts`에서 prod 차단**: 적용 범위 불투명. 라우트 자체에서 `notFound()` 호출이 가장 명확.

**Notes**:
- 경로명 결정(`_dev` vs `(dev)`)은 PR2 구현 시 Next 15에서 실측 후 확정. 결과를 tasks.md에 기록.

## R-5. `@apply` 정책 + 기존 `.prose` 규칙 이전

**Decision**: `@apply`는 **기존 `globals.css`의 `.prose .table-cards` / `.weather-toggle` 계열 규칙을 그대로 유지**할 때만 허용. 신규 shadcn 컴포넌트와 폼 마이그레이션 산출물은 `@apply` 대신 **variants(cva) + 클래스 조합(cn)** 을 사용한다.

**Rationale**:
- `.prose` 규칙은 마크다운 렌더링 UI(여행 문서 뷰어)의 스타일로 컴포넌트 외부의 HTML 출력에 적용된다. 따라서 컴포넌트화 불가능 → `@apply`로 묶는 것이 합리적.
- 컴포넌트는 `cva`로 variants 선언 → 사용처에서 `cn(buttonVariants({ variant, size }), className)`으로 조합. `@apply` 난발 시 유지보수 난이도 급증.
- 라이트 단독 정책: `dark:` variants 사용 금지. 기존 코드에서 `dark:` 사용처 0건 확인(grep). shadcn 템플릿의 `dark:` 클래스는 수용하되 `@theme`의 다크 변수 블록은 제거하여 `dark:` 변형이 실제로 색을 바꾸지 않도록 한다.

**Alternatives considered**:
- **`.prose` 규칙도 cva로 재작성**: 외부 HTML에는 적용 불가. 기각.
- **모든 shadcn 컴포넌트에서 `@apply` 허용**: variants 관리가 힘들어짐. 기각.

## R-6. 폼 마이그레이션 리스크 차단 (서버 액션·이벤트 시그니처 보존)

**Decision**: 폼 컴포넌트 6종 마이그레이션 시 **컴포넌트 내부 마크업만 shadcn 기반으로 교체**하고, 다음 요소는 **1:1 보존**한다.

- 서버 액션 호출 경로(`src/app/actions/**` import + 호출 인자)
- 이벤트 핸들러 시그니처(e.g. `onSubmit`, `onClick` props의 타입·이름)
- 폼 필드 name 속성 + 반환 타입(FormData key와 서버 파싱이 동일해야 함)
- 접근성 속성(`aria-label`, `aria-describedby`, `role`) — shadcn `Form` 컴포넌트가 이를 자동 부여하면 수동 속성 제거 가능

**Rationale**:
- 헌법 V(Cross-Domain Integrity): UI 교체가 일정 편성·동행 협업 도메인의 서버 계약을 변경하면 안 된다.
- 회귀 방지: 기존 E2E/integration 테스트가 있다면 마이그레이션 후에도 통과해야 함(vitest `pnpm test` 결과로 증명).
- 마이그레이션 대상 6종의 현재 서버 액션 매핑을 tasks 단계에서 명시적으로 수집(체크박스로 관리).

**Alternatives considered**:
- **폼 로직까지 shadcn `useForm` + react-hook-form + zod로 재작성**: 라이브러리 3개 추가 + 서버 액션 스키마 재정의. 본 피처 범위(UI 레이어) 초과. Phase 2 후속 이슈로 분리.

## R-7. 디자이너 핸드오프 이슈 템플릿 (GitHub Issue Forms)

**Decision**: `.github/ISSUE_TEMPLATE/design-handoff.yml`에 GitHub Issue Forms 스키마로 템플릿 정의. 필수 필드 6종은 `required: true`로 강제한다.

```yaml
name: 🎨 Designer Handoff
description: 디자이너 → 개발자 핸드오프 요청
title: "[Handoff] "
labels: ["design-handoff"]
body:
  - type: input
    id: figma-url
    attributes:
      label: Figma URL
      description: 핸드오프 대상 Frame/Component의 Figma 링크
    validations:
      required: true
  - type: textarea
    id: screenshots
    attributes:
      label: 스크린샷
      description: 주요 상태(default/hover/focus/disabled)를 포함한 이미지 첨부
    validations:
      required: true
  - type: textarea
    id: variants-states
    attributes:
      label: Variants & States
      description: 사이즈(sm/md/lg), 색상, 상태 등 나열
    validations:
      required: true
  - type: textarea
    id: interactions
    attributes:
      label: 인터랙션
      description: 클릭/포커스/애니메이션 의도
    validations:
      required: true
  - type: textarea
    id: data-binding
    attributes:
      label: 데이터 바인딩 의도
      description: 어떤 데이터가 어디에 표시되는가
    validations:
      required: true
  - type: dropdown
    id: token-changes
    attributes:
      label: 토큰 변경 여부
      options:
        - "없음 — 기존 토큰만 사용"
        - "있음 — tokens.json에도 변경 첨부"
    validations:
      required: true
```

**Rationale**:
- GitHub Issue Forms는 필드 유효성 검증을 UI에서 강제 → 누락 필드가 저장소에 들어오지 않음(spec FR-010, SC-005 충족).
- `labels: ["design-handoff"]`로 자동 라벨 부여 → 개발자가 필터링 가능.
- 파일 업로드는 GitHub UI 기본 기능(이미지 드래그) 사용. 별도 첨부 스키마 불요.

**Alternatives considered**:
- **Markdown 템플릿(`.md`)**: 필드 유효성 검증이 없어 누락 방지 어려움.
- **Notion/Slack 외부 폼**: GitHub 이슈 중심 워크플로우(spec Clarifications #4)와 동선 어긋남.

## R-8. 업무 프로세스 문서(WORKFLOW.md) 구조 + CLAUDE.md 권위 위임

**Decision**: `docs/WORKFLOW.md`를 단일 정본으로 두고 다음 7개 최상위 섹션을 순서대로 기술한다.

1. **팀 구성·역할** — BE 개발자(도메인·게이트), 디자이너(Figma·핸드오프), AI 에이전트(Claude Code·v0.dev·MCP)
2. **이슈 흐름** — 마일스톤 배정 → 워크트리 분기(`/devex:flow`) → 구현 → PR → 머지
3. **버전·릴리즈 정책** — towncrier 단편, 마일스톤 close = release 신호, release PR, main 머지, 자동 tag/release/PyPI
4. **디자이너 협업 흐름** — Figma 작업 → Tokens Studio export 또는 Frame 핸드오프 → v0.dev/Claude Code 변환 → 도메인·접근성·회귀 검토 → PR → 머지
5. **AI 에이전트 활용** — Claude Code(구현/리뷰), v0.dev(컴포넌트), devex:flow(이슈→PR), MCP(trip 데이터)
6. **마일스톤 운영** — 모든 이슈 마일스톤 필수, 닫힌 마일스톤 추가 변경 금지, 버전 = 마일스톤
7. **핫픽스 흐름** — hotfix/* 브랜치 → 단편 추가 → develop 경유 → 다음 PATCH 마일스톤

`docs/design-handoff.md`는 섹션 4에서 상세 위임 링크. `docs/README.md`는 두 파일로의 1홉 진입.

`CLAUDE.md`는 "작업 규칙"(또는 새 "업무 프로세스") 섹션 끝에 다음 1블록 추가:

> **업무 프로세스의 단일 정본은 [`docs/WORKFLOW.md`](./docs/WORKFLOW.md)이다.** 이슈·릴리즈·디자이너 협업·핫픽스 흐름이 본 문서와 상충할 경우 WORKFLOW.md를 따른다. AI 에이전트는 모호한 흐름에서 WORKFLOW.md를 1차 컨텍스트로 참조한다.

루트 `README.md`는 상단 소개 문단 끝에 한 줄:

> 협업 모델: 1인 BE + 디자이너 + AI 에이전트 하이브리드. 상세 — [docs/WORKFLOW.md](./docs/WORKFLOW.md).

**Rationale**:
- 중복 정본 방지: CLAUDE.md가 기존에 갖고 있던 "Git 워크플로우 규칙"·"릴리즈 프로세스"·"마일스톤 정책" 일부는 WORKFLOW.md로 이주 또는 요약. CLAUDE.md는 AI 에이전트용 1차 컨텍스트로 역할 축소(위임 링크 중심).
- `docs/` 디렉토리를 단일 진입 지점으로 삼으면 신규 합류자가 한 곳에서 탐색 가능(spec SC-007).
- AI 에이전트가 "모호한 흐름에서 WORKFLOW.md를 1차 참조"하도록 명시하면 세션 간 행동 일관성 강화(spec Clarifications #4, US4).

**Alternatives considered**:
- **기존 CLAUDE.md만 확장**: CLAUDE.md는 AI 에이전트 지시 중심(톤·규칙)이라 신규 합류자(사람) 가독성 떨어짐. 역할 분리가 맞다.
- **공개 위키(GitHub Wiki)에 작성**: 레포와 분리되어 PR 기반 리뷰 불가. 포기.
- **Notion**: 외부 서비스 종속. 헌법 II(최소 비용).

---

모든 결정은 spec의 FR(15건)·SC(9건)·Clarifications(6건)와 정합한다. Phase 1 산출물(data-model, contracts, quickstart)은 본 연구 기반으로 작성한다.
