# Implementation Plan: shadcn/ui Phase 2 — 복합 컴포넌트 + 레거시 유틸리티 제거

**Branch**: `013-shadcn-phase2` | **Date**: 2026-04-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-shadcn-phase2/spec.md`

## Summary

v2.5.0 마일스톤. 스펙 012에서 남겨둔 Phase 2를 완결한다. **복합 컴포넌트(`ActivityCard`/`ActivityList`/`DayEditor`) shadcn 전환 + 주요 페이지(`/`/`/trips/[id]`/`/trips/[id]/day/[dayId]`) shadcn Card 정식 전환 + 레거시 커스텀 유틸리티(`rounded-card`/`shadow-card`/`bg-primary-*`/`text-surface-*`/`text-heading-*`/`text-body-*`) 전면 제거 + `design/tokens.json` ↔ `globals.css` 정합성 재검토**로 구성된다. v2.4.3(Phase 1) 코드 위에 올라가며, v2.4.4의 #285(DAY 넘버링)·#286(CI 게이트) 머지 상태를 전제. semantic 토큰 매핑(브랜드 파랑 연결)·Latin 폰트 교체·다크 모드는 **도입하지 않는다**(디자이너 합류 후 별도 스펙). PR은 컴포넌트 단위(최소 4개) + 정리 단위(1개)로 분할한다.

## Coverage Targets

- 복합 컴포넌트 3종(`ActivityCard`/`ActivityList`/`DayEditor`) shadcn `<Card>` + `<Field>` 전환 [why: complex-migrate] [multi-step: 3]
- 홈 + 여행 상세 + 동행자 섹션 shadcn 정식 전환 (POC 결과 재작성) [why: page-migrate] [multi-step: 3]
- Day 상세 페이지 shadcn 적용 (#285 로직 수용 후 UI 재구성) [why: day-detail-migrate] [multi-step: 2]
- 레거시 커스텀 유틸리티 전면 제거 (grep 0 달성) + `design/tokens.json` ↔ `globals.css` 정합 재검토 [why: legacy-cleanup] [multi-step: 4]
- 미리보기 카탈로그(`/_dev/components`) 확장 — Phase 2 대상 컴포넌트 추가 [why: catalog-expand]
- quickstart Evidence 수집 (4개 플로우 · 375px/1280px · 접근성 Tab 순회) [why: visual-evidence] [multi-step: 3]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+. CSS는 Tailwind v4 CSS-first(`@theme`) 그대로 승계.
**Primary Dependencies**: Next.js 16 (App Router · Turbopack), React 19, Tailwind CSS v4, shadcn/ui(vendored), Radix UI primitives(필요분), `class-variance-authority`, `tailwind-merge`, `clsx`, `lucide-react`, `tailwindcss-animate`, Style Dictionary v4 (토큰 빌드). v2.4.3 대비 신규 패키지 도입 없음.
**Storage**: N/A (UI 전용 피처, 데이터 스키마 변경 없음).
**Testing**: `pnpm tsc --noEmit`, `pnpm build`, `pnpm test`(vitest + @testing-library), `pnpm lint`, `pnpm run tokens:build` 재생성 후 diff 확인. 시각 검증은 quickstart 수동 Evidence(375px/1280px 스크린샷). 접근성 검증은 Tab/Shift+Tab 순회 수동 Evidence.
**Target Platform**: 브라우저(Next.js RSC/SSR). 모바일 375px + 데스크톱 1280px 두 뷰포트.
**Project Type**: web-application (Next.js 웹앱 + Python MCP 서버 공존, 본 피처는 웹 영역만 터치).
**Performance Goals**: CSS 번들 크기 v2.4.3 대비 동등 또는 감소(유틸리티 제거 효과 기대). JS 번들 영향은 shadcn 컴포넌트 내부 의존성에 한정. 페이지별 LCP 회귀 없음.
**Constraints**: 라이트 단독(다크 분기 코드 0건 유지), `@apply` 남발 금지, 레거시 유틸리티 0건(의도된 예외 경로 제외), semantic 토큰은 shadcn 기본값(neutral) 유지, 신규 UI 의존성 도입 금지, `_dev/*` 경로는 프로덕션 자산에서 제외.
**Scale/Scope**: 복합 컴포넌트 3종 + 주요 페이지 3개(`/`/`/trips/[id]`/`/trips/[id]/day/[dayId]`) + MemberList + 레거시 유틸리티 정의 제거(tokens.json/`@theme`/사용처 일괄) + 미리보기 카탈로그 3종 추가.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 준수 여부 | 검토 |
|------|----------|------|
| I. AX-First | ✅ 해당 없음 | UI 레이어 전환. AI 워크플로우 개입 없음. 단, 시스템 일관성 강화로 이후 AI 에이전트(v0.dev 등) 산출물 수용성이 간접 상승. |
| II. Minimum Cost | ✅ 준수 | 신규 SaaS/패키지 0건. shadcn 컴포넌트는 이미 v2.4.3에서 vendored. 추가 번들 증가 없음(유틸리티 제거로 오히려 감소 기대). |
| III. Mobile-First Delivery | ✅ 준수 | 복합 컴포넌트·페이지 전환은 375px 스크린샷 증거 필수(quickstart). 브레이크포인트 분기 금지 규칙 유지. 목록·상세·Day 상세 모두 단일 레이아웃. |
| IV. Incremental Release | ✅ 준수 | 최소 5개 PR로 분할(복합 3종 각 1 + 페이지 1 + 정리 1). 각 PR 머지 시점에 앱이 시각적 동등 또는 개선 상태 유지(US1 Independent Test). |
| V. Cross-Domain Integrity | ✅ 준수 | 본 피처는 UI 레이어 전환. 기존 도메인(일정 편성·여행 탐색·동행 협업·예산 관리·일정 활용) 데이터·서버 액션 시그니처 변경 0건. 복합 컴포넌트 이전 시 `src/app/actions/**` 호출부 보존 필수(PR 리뷰 체크). |
| VI. Role-Based Access Control | ✅ 준수 | 기존 권한 매트릭스(OWNER/HOST/GUEST) 그대로 준수. `ActivityList`/`DayEditor`의 `canEdit` 분기·disabled 상태는 현행 유지. 신규 권한 행위 추가 없음. |

추가 고려:

- **#285 로직 수용**: `ActivityList.tsx`·`day/[dayId]/page.tsx`가 v2.4.4에서 대폭 변경됨. Phase 2는 **로직 보존 + 시각만 재작성**이 원칙. 행위·API 호출 시그니처를 건드리지 않는다. PR 리뷰에서 `git diff`로 로직 영역(핸들러·API 호출) 변경 0건 확인.
- **#300 Decimal 직렬화**: Day 상세 회귀 판정의 전제 조건. 본 피처가 develop 머지되기 전에 #300이 develop에 들어가 있어야 한다. 본 피처 자체가 #300을 포함하지 않도록 주의(별도 hotfix로 처리).
- **미리보기 경로**: `/_dev/components`는 스펙 012 PR2에서 도입됨. Phase 2에서 복합 컴포넌트 카탈로그를 확장할 때 프로덕션 번들 제외 조건(012 Phase 0 R-4 결정 준수) 유지.

## Project Structure

### Documentation (this feature)

```text
specs/013-shadcn-phase2/
├── plan.md                 # This file
├── research.md             # Phase 0 — 구현 수단 선택 근거 (R-1~R-5)
├── data-model.md           # Phase 1 — UI 전용, 기존 엔티티 참조만
├── quickstart.md           # Phase 1 — US별 수동/자동 Evidence 규약
├── contracts/              # Phase 1 — 외부 계약
│   ├── component-api.md    # 복합 컴포넌트 Props 보존 계약 (로직 불변)
│   └── legacy-removal.md   # 레거시 유틸리티 제거 목록 + 예외 경로 계약
├── checklists/             # /speckit.specify에서 생성
│   └── requirements.md
└── tasks.md                # Phase 2 출력 (/speckit.tasks 명령)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── globals.css                          # 레거시 @theme 블록에서 제거 대상 토큰 정리 (PR5)
│   ├── page.tsx                             # 홈 여행 목록 shadcn 정식 전환 (PR2 page-migrate)
│   ├── _dev/
│   │   └── components/
│   │       └── page.tsx                     # 복합 컴포넌트 카탈로그 확장 (PR1~PR3)
│   └── trips/
│       └── [id]/
│           ├── page.tsx                     # 여행 상세 shadcn 전환 (PR2 page-migrate)
│           └── day/
│               └── [dayId]/
│                   └── page.tsx             # Day 상세 shadcn 전환 (PR3 day-detail-migrate)
└── components/
    ├── ActivityCard.tsx                     # PR1 complex-migrate
    ├── ActivityList.tsx                     # PR1 complex-migrate
    ├── DayEditor.tsx                        # PR1 complex-migrate
    ├── MemberList.tsx                       # PR2 page-migrate
    ├── InviteButton.tsx                     # 변경 없음 (Phase 1 완료)
    ├── DeleteTripButton.tsx                 # 변경 없음
    ├── LeaveTripButton.tsx                  # 변경 없음
    ├── TodayButton.tsx                      # 변경 없음
    ├── AuthButton.tsx                       # 변경 없음 (#301 nativeButton 경고는 POC 관찰로 발견 — 필요 시 별도 fix)
    ├── ActivityForm.tsx                     # 변경 없음 (Phase 1 완료)
    └── ui/                                  # shadcn vendored — 필요 시 Field/Badge/Popover 추가
design/
└── tokens.json                              # 제거 대상 토큰 정리 (PR5 legacy-cleanup)
```

**Structure Decision**: 012와 동일한 단일 Next.js 웹앱 구조. 변경 영역은 `src/app/{page.tsx,trips/[id]/*}` · `src/components/{Activity*,Day*,MemberList}.tsx` · `design/tokens.json` · `globals.css`. 카탈로그 경로(`/_dev/components`)는 확장. 복합 컴포넌트 3종은 **동일 파일 위치**에서 외곽만 shadcn `<Card>`로 재구성하며, 내부 서버 액션 호출부는 보존.

## Complexity Tracking

> Constitution Check 모든 gate 통과 — 정당화 필요 위반 없음.
