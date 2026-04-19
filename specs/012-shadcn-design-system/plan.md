# Implementation Plan: 디자인 시스템 기반 제정 — Tailwind v4 + shadcn/ui + 핸드오프 + 업무 프로세스

**Branch**: `012-shadcn-design-system` | **Date**: 2026-04-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-shadcn-design-system/spec.md`

## Summary

v2.4.3 마일스톤 통합. 현행 Tailwind v3 + 자체 컴포넌트 구조를 **Tailwind v4 `@theme` CSS-first 토큰 체계 + shadcn/ui vendoring + Style Dictionary 토큰 빌드 + 디자이너 핸드오프 이슈 템플릿 + 단일 업무 프로세스 문서**로 전환한다. 5개 PR(A 전환 → B 초기화 → C 마이그레이션 → D 파이프라인 → E 문서)로 분할 배포. 라이트 모드 단독, 수동 트리거 + 개발자 게이트 협업 모델. 웹 프레임워크 버전(Next.js 15)은 현행 유지하고, 메이저 업그레이드(v2.4.2 트랙 #249 등)와는 독립 진행.

## Coverage Targets

- Tailwind v4 전환 (PostCSS + globals.css @theme + tailwind.config.ts 제거) [why: tailwind-v4] [multi-step: 3]
- shadcn/ui 초기화 + 초기 컴포넌트 셋 vendoring [why: shadcn-init] [multi-step: 2]
- 폼 컴포넌트 Phase 1 마이그레이션 (6종) + 미리보기 경로 `/_dev/components` [why: form-migration] [multi-step: 2]
- Style Dictionary 토큰 빌드 스크립트 + `tokens.json` 예시 [why: tokens-build] [multi-step: 2]
- 디자이너 핸드오프 이슈 템플릿 [why: handoff-template]
- 업무 프로세스 문서 + 디자이너 핸드오프 상세 + 상호 링크 [why: workflow-docs] [multi-step: 3]
- 각 PR별 quickstart Evidence 수집 [why: visual-evidence] [multi-step: 3]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+. CSS는 Tailwind v4 CSS-first 구성(`@theme`).
**Primary Dependencies**: Next.js 15 (App Router), React 19, Tailwind CSS v4(`tailwindcss@^4`, `@tailwindcss/postcss`), shadcn/ui(vendored), Radix UI primitives(필요분만), `class-variance-authority`, `tailwind-merge`, `clsx`, `lucide-react`, `tailwindcss-animate`, Style Dictionary(`style-dictionary@^4`).
**Storage**: N/A (정적 토큰 + 컴파일된 CSS)
**Testing**: `pnpm tsc --noEmit` 타입 검사, `pnpm build` Next 빌드, `pnpm test` vitest, `pnpm lint` ESLint, `pnpm run tokens:build` 토큰 재생성 + git diff 확인. 시각 검증은 quickstart 수동 Evidence(스크린샷).
**Target Platform**: 브라우저(Next.js RSC/SSR). 모바일 375px + 데스크톱 1280px 두 뷰포트 기준.
**Project Type**: web-application (Next.js 웹앱 + Python MCP 서버 공존, 본 피처는 웹 영역만 터치)
**Performance Goals**: Tailwind v4 전환 후 CSS 번들 크기가 현행 대비 동등 또는 감소. 신규 shadcn 컴포넌트가 요구되지 않는 페이지는 JS 번들 증가 0바이트. 폼 마이그레이션 후 Lighthouse Accessibility 점수 동등 또는 개선.
**Constraints**: 라이트 단독(다크 분기 코드 0건), `@apply` 남발 금지(CSS 변수·토큰 기반), `_dev/*` 경로는 프로덕션 자산에 포함되지 않음, 모든 신규 UI 의존성은 번들 영향 검토 후 도입.
**Scale/Scope**: 루트 레이아웃·전 페이지 영향(CSS 토큰 교체) + 초기 shadcn 컴포넌트 11종(Button·Input·Label·Form·Card·Dialog·DropdownMenu·Select·Tabs·Toast·Skeleton) + 폼 컴포넌트 6종 마이그레이션 + 미리보기 경로 1개 + 토큰 빌드 스크립트 1개 + 이슈 템플릿 1개 + 신규 문서 2개 + 기존 문서 3개 갱신.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 준수 여부 | 검토 |
|------|----------|------|
| I. AX-First | ✅ 해당 없음 | 디자인 시스템 기반은 인프라·표면 작업. AI 워크플로우 개입 없음. 단, 본 시스템이 이후 AI 에이전트(v0.dev·Claude Code)의 산출물 수용성을 높여 AX를 간접 강화. |
| II. Minimum Cost | ✅ 준수 | 신규 유료 SaaS 0건. shadcn은 코드 vendoring이라 외부 종속 없음. 추가 npm 패키지는 빌드 타임·번들 크기만 영향(번들 증가분은 Phase 0 R-2에서 추정). |
| III. Mobile-First Delivery | ✅ 준수 | 라이트 단독 + 토큰 기반 간격·타이포는 모바일 기준으로 설계. 폼 마이그레이션은 375px 스크린샷 증거 필수(quickstart). 브레이크포인트 분기 금지 규칙은 유지. |
| IV. Incremental Release | ✅ 준수 | 5개 PR로 분할(A→B→C→D→E). A 단독 머지 시에도 앱은 시각적 동등성 유지(US1 Independent Test). 기존 기능 회귀 0건이 머지 게이트. |
| V. Cross-Domain Integrity | ✅ 준수 | 본 피처는 UI 레이어 + 문서·템플릿 · 토큰. 기존 도메인(일정 편성·여행 탐색·동행 협업·예산 관리·일정 활용) 데이터·계약 변경 0건. 폼 마이그레이션은 컴포넌트 내부 마크업만 교체하며 서버 액션·Prisma 호출 시그니처 변경 금지. |
| VI. Role-Based Access Control | ✅ 준수 | 폼 컴포넌트는 기존 권한 매트릭스(OWNER/HOST/GUEST) 그대로 준수. 미리보기 경로 `/_dev/components`는 개발자 전용(프로덕션 제외) — 비로그인/일반 사용자 접근 제한은 Phase 0 R-4에서 확정. 신규 권한 행위 추가 없음. |

추가 고려:
- 본 피처는 기존 도메인 소유권(헌법 V)을 건드리지 않으나 컴포넌트 마이그레이션 시 기존 이벤트 핸들러·서버 액션 호출 시그니처를 보존해야 한다. 마이그레이션 PR(PR3) 리뷰에서 `src/app/actions/**` 호출부가 변경되지 않았음을 확인한다.
- 미리보기 경로 `/_dev/components`는 프로덕션 빌드에 포함하지 않기 위해 Next.js `NODE_ENV` 기반 조건부 라우팅 또는 별도 디렉토리 규약을 Phase 0 R-4에서 확정.

## Project Structure

### Documentation (this feature)

```text
specs/012-shadcn-design-system/
├── plan.md                 # This file
├── research.md             # Phase 0 — 구현 수단 선택 근거 (R-1~R-8)
├── data-model.md           # Phase 1 — 토큰 스키마(DTCG), 컴포넌트 variants 규약
├── quickstart.md           # Phase 1 — US별 수동/자동 Evidence
├── contracts/              # Phase 1 — 외부 계약
│   ├── token-pipeline.md   # tokens.json → CSS 변수 빌드 계약
│   ├── component-api.md    # shadcn 컴포넌트 + 마이그레이션 대상 Props 계약
│   └── handoff-template.md # GitHub Issue 템플릿 계약
├── checklists/             # /speckit.specify에서 생성
│   └── requirements.md
└── tasks.md                # Phase 2 출력 (/speckit.tasks 명령)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── globals.css                          # Tailwind v4 @theme 토큰 + 기존 .prose 규칙 이식 (PR1)
│   ├── layout.tsx                           # shadcn Toaster 등 전역 프로바이더 추가 지점 (PR2)
│   ├── _dev/
│   │   └── components/
│   │       └── page.tsx                     # 디자이너 검수용 카탈로그 (PR2~PR3, dev-only)
│   ├── about/                               # 변경 없음
│   ├── settings/                            # 폼 컴포넌트 마이그레이션 영향 (PR3)
│   └── trips/                               # 폼 컴포넌트 마이그레이션 영향 (PR3)
├── components/
│   ├── ui/                                  # shadcn vendored (PR2, 신규)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── form.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── select.tsx
│   │   ├── tabs.tsx
│   │   ├── toast.tsx
│   │   └── skeleton.tsx
│   ├── ActivityForm.tsx                     # PR3 마이그레이션 대상
│   ├── AuthButton.tsx                       # PR3 마이그레이션 대상
│   ├── DeleteTripButton.tsx                 # PR3 마이그레이션 대상
│   ├── LeaveTripButton.tsx                  # PR3 마이그레이션 대상
│   ├── InviteButton.tsx                     # PR3 마이그레이션 대상
│   ├── TodayButton.tsx                      # PR3 마이그레이션 대상
│   ├── Footer.tsx                           # 기존 유지 (011에서 도입)
│   └── …                                    # Phase 2 대상(ActivityCard, DayEditor 등) — 본 피처 범위 외
└── lib/
    └── utils.ts                             # shadcn cn() 헬퍼 (PR2, 신규)

design/                                      # PR4, 신규 디렉토리
├── tokens.json                              # W3C DTCG 형식 디자이너 원본
└── README.md                                # 디자이너용 편집 가이드

scripts/                                     # 기존 디렉토리
└── build-tokens.ts                          # PR4, Style Dictionary 구동 (tokens.json → globals.css @theme 병합)

.github/
├── ISSUE_TEMPLATE/
│   └── design-handoff.yml                   # PR4, 신규
└── workflows/                               # 변경 없음 (CI 게이트는 기존 speckit-gate 재사용)

docs/                                        # PR5
├── README.md                                # 색인 갱신
├── WORKFLOW.md                              # 신규 — 팀·이슈·릴리즈·디자이너·AI·마일스톤·핫픽스 7섹션
└── design-handoff.md                        # 신규 — 핸드오프 상세

CLAUDE.md                                    # PR5 갱신 — WORKFLOW.md 권위 위임 명시
README.md                                    # PR5 갱신 — 협업 모델 한 줄 + WORKFLOW.md 링크
postcss.config.mjs                           # PR1 재구성 — @tailwindcss/postcss로 교체
tailwind.config.ts                           # PR1 제거 — @theme로 이전
package.json                                 # PR1~PR4 의존성 반영 + tokens:build 스크립트 추가
```

**Structure Decision**: Next.js App Router 단일 앱 구조를 유지한다. 디자인 토큰 원본은 `design/tokens.json`에 둔다(`src/` 외부, 빌드 산출물의 입력). shadcn 컴포넌트는 프로젝트 관례대로 `src/components/ui/`에 vendoring한다(shadcn CLI의 기본 경로). 헬퍼는 `src/lib/utils.ts`에 `cn()` 하나만 두며 기존 `src/lib/*` 파일과 병렬 배치. 미리보기 경로 `/_dev/components`는 개발 환경에서만 활성화되며 프로덕션 빌드에는 포함하지 않는다(상세는 Phase 0 R-4). 기존 `src/components/Footer.tsx`·`ScrollToTop.tsx`·`SessionProvider.tsx`는 본 피처에서 건드리지 않는다. `tailwind.config.ts`는 PR1 단계에서 삭제하고 모든 토큰은 `globals.css`의 `@theme` 블록으로 이전한다.

## Complexity Tracking

본 피처는 복잡도 억제를 우선한다. 헌법 위배 0건. 다만 다음 두 항목은 "단순 추가" 이상의 구조적 결정을 포함하므로 명시한다.

| 결정 | 필요성 | 기각한 더 단순한 대안 |
|------|--------|----------------------|
| Tailwind v4 CSS-first (`tailwind.config.ts` 제거) | shadcn v4·디자이너 DTCG 파이프라인과 정합. 토큰 소스를 CSS 한 곳으로 수렴해 drift 방지. | `tailwind.config.ts` 유지 + v4 호환 모드: 토큰이 TS·CSS에 이중 배치되어 디자이너 산출물(DTCG)과 1:1 매핑이 어려움. |
| `design/tokens.json` + Style Dictionary 빌드 | 디자이너가 Tokens Studio에서 내보낸 원본을 그대로 사용 + CSS 변수 자동 생성. 디자이너·개발자 경계가 명확. | 토큰을 직접 `globals.css`에 수기 편집: 디자이너가 CSS 구문을 알아야 하고 drift 검증 어려움. 헌법 II(최소 비용) 관점에서도 자동 재생성이 유지비 절감. |
