---

description: "Task list for 012-shadcn-design-system"
---

# Tasks: 디자인 시스템 기반 제정 — Tailwind v4 + shadcn/ui + 핸드오프 + 업무 프로세스

**Input**: Design documents from `/specs/012-shadcn-design-system/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/token-pipeline.md](./contracts/token-pipeline.md), [contracts/component-api.md](./contracts/component-api.md), [contracts/handoff-template.md](./contracts/handoff-template.md), [quickstart.md](./quickstart.md)

**Tests**: 본 피처는 UI 레이어·문서·템플릿·빌드 스크립트가 중심이다. 단위 테스트 추가 대신 `pnpm tsc --noEmit`·`pnpm build`·`pnpm test`(기존 vitest)·토큰 빌드 멱등성·lint를 계약 검증 수단으로 사용한다. TDD 태스크는 포함하지 않는다.

**Organization**: 태스크는 User Story 단위로 묶이며, PR 분할은 quickstart의 Rollout 순서를 따른다.

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

- **[P]**: 다른 파일, 선행 태스크와 충돌 없어 병렬 가능
- **[Story]**: 해당 태스크가 소속된 User Story (US1/US2/US3/US4)
- **[artifact]**: 산출 파일 상대 경로 또는 `path::symbol`
- **[why]**: plan의 Coverage Target과 일치하는 그룹 태그

## Path Conventions

Next.js App Router 단일 앱 구조. 소스 경로는 `src/` 기준, 설정·스크립트는 저장소 루트 기준. 디자인 토큰 원본은 `design/` 디렉토리(신규).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 증거 수집 디렉토리. 본 피처 전용 공유 인프라는 최소화.

- [ ] T001 증거 수집 디렉토리 생성 `docs/evidence/012-shadcn-design-system/` (빈 `.gitkeep`) [artifact: docs/evidence/012-shadcn-design-system/.gitkeep] [why: visual-evidence]

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 본 피처의 Foundational은 **Phase 3 US1이 곧 기반 자체**이므로 별도 선행 태스크가 없다. US2~US4는 US1의 Tailwind v4 전환(PR1) 완료 후 진입한다.

**⚠️ CRITICAL**: US2(폼 마이그레이션)·US3의 `tokens-build` 계열·UI 관련 작업은 US1의 PR1(Tailwind v4) 머지 후에만 안전. US4(문서)는 US1과 독립 진행 가능.

---

## Phase 3: User Story 1 - 디자인 시스템 기반 (Priority: P1) 🎯 MVP

**Goal**: Tailwind v4 `@theme` 토큰 체계로 전환하고 shadcn/ui 초기 컴포넌트 셋을 vendoring하여, 개발자·AI 에이전트가 표준 명령 한 줄로 신규 컴포넌트를 추가할 수 있는 기반을 제공. 앱은 시각적으로 동등 유지, 다크 모드 분기 제거.

**Independent Test**: (1) 기존 페이지 시각 동등, (2) `npx shadcn@latest add button` 성공, (3) 추가 컴포넌트 토큰 결합 렌더, (4) `rg "dark:|prefers-color-scheme" src/` 0건. quickstart US1-1~US1-5 참조.

### Implementation for User Story 1

#### Sub-group A: Tailwind v4 전환 (PR1, [why: tailwind-v4])

- [ ] T002 [US1] `package.json` 의존성 갱신 — `tailwindcss@^3.4` → `^4`, 신규 `@tailwindcss/postcss@^4` 추가, `autoprefixer` 제거(v4가 내장). `@tailwindcss/typography`는 v4 호환 최신으로 유지. [artifact: package.json] [why: tailwind-v4]
- [ ] T003 [US1] `postcss.config.mjs` 재구성 — `tailwindcss`+`autoprefixer` 2플러그인 구성을 `@tailwindcss/postcss` 단일 플러그인으로 교체. [artifact: postcss.config.mjs] [why: tailwind-v4]
- [ ] T004 [US1] `src/app/globals.css` 재작성 — 기존 `@tailwind base/components/utilities` 3지시어 제거, 상단에 `@import "tailwindcss";` + `@plugin "@tailwindcss/typography";` 선언, 그 아래 `@theme { /* BEGIN:tokens */ … /* END:tokens */ }` 블록에 기존 `tailwind.config.ts`의 팔레트(primary·surface·sky) + borderRadius(card) + boxShadow(card/card-hover/fab) + maxWidth(content)를 CSS 변수로 1:1 이식. 기존 `.prose .table-cards`·`.weather-toggle`·`pre`·`blockquote`·`a[href^="https://maps"]` 규칙은 sentinel 블록 밖으로 보존. [artifact: src/app/globals.css] [why: tailwind-v4]
- [ ] T005 [US1] `tailwind.config.ts` 삭제 — v4 CSS-first 구성으로 전환. import/참조가 있으면 함께 제거. [artifact: tailwind.config.ts] [why: tailwind-v4]
- [ ] T006 [US1] PR1 빌드·타입·테스트·린트 실측 — `pnpm install` → `pnpm tsc --noEmit` → `pnpm build` → `pnpm test` → `pnpm lint`. 모든 스테이지 통과 확인. 실패 시 T002~T005 수정 후 재실행. [artifact: specs/012-shadcn-design-system/quickstart.md] [why: visual-evidence]

#### Sub-group B: shadcn/ui 초기화 + 초기 컴포넌트 셋 (PR2, [why: shadcn-init])

- [ ] T007 [US1] shadcn CLI 초기화 — `npx shadcn@latest init` 실행(style: new-york, rsc: true, tsx: true, baseColor: slate, cssVariables: true, prefix: ""). 산출: `components.json`. 상호작용 프롬프트에서 css 경로는 `src/app/globals.css`로 지정. [artifact: components.json] [why: shadcn-init]
- [ ] T008 [US1] `src/lib/utils.ts` 작성 — `cn()` 헬퍼(`clsx` + `tailwind-merge`). shadcn CLI가 자동 생성하지 않는 경우 수동 추가. [artifact: src/lib/utils.ts::cn] [why: shadcn-init]
- [ ] T009 [US1] shadcn 초기 컴포넌트 11종 vendoring — `npx shadcn@latest add button input label form card dialog dropdown-menu select tabs sonner skeleton` 실행. 산출: `src/components/ui/` 하위 11개 파일. toast는 sonner 채택(shadcn 공식 전환). [artifact: src/components/ui/button.tsx|src/components/ui/input.tsx|src/components/ui/label.tsx|src/components/ui/form.tsx|src/components/ui/card.tsx|src/components/ui/dialog.tsx|src/components/ui/dropdown-menu.tsx|src/components/ui/select.tsx|src/components/ui/tabs.tsx|src/components/ui/sonner.tsx|src/components/ui/skeleton.tsx] [why: shadcn-init]
- [ ] T010 [US1] 루트 레이아웃에 Toaster 배치 — `src/app/layout.tsx`의 `<body>` 말미(Footer 직전 또는 직후)에 `<Toaster />`(from `@/components/ui/sonner`) 삽입. [artifact: src/app/layout.tsx] [why: shadcn-init]
- [ ] T011 [US1] 미리보기 카탈로그 페이지 — `src/app/_dev/components/page.tsx` 또는 `src/app/(dev)/components/page.tsx`(research R-4에 따라 실측 후 경로 확정). `process.env.NODE_ENV === "production"`이면 `notFound()` 호출. 11종 shadcn 컴포넌트를 variant·size 매트릭스로 섹션별 렌더. [artifact: src/app/_dev/components/page.tsx] [why: shadcn-init]
- [ ] T012 [US1] PR2 빌드·타입·테스트·린트 재실측 — T006과 동일 절차. 추가로 `pnpm dev`로 `/` 및 `/_dev/components` 확인. 다크 모드 변수 블록이 globals.css에 남아있으면 제거(shadcn CLI가 `.dark` 블록을 자동 주입하므로). [artifact: specs/012-shadcn-design-system/quickstart.md] [why: visual-evidence]

#### Sub-group C: US1 Evidence 수집

- [ ] T013 [US1] quickstart US1-1~US1-5 실행 — 주요 페이지 12장 스크린샷(전·후 6경로 × 모바일/데스크톱), `rg "dark:|prefers-color-scheme" src/ 2>/dev/null` 결과 0건 증거 캡처, `pnpm run tokens:build` 미적용(Phase 5에서 도입) 건은 스킵. quickstart.md의 US1 체크리스트 체크. [artifact: specs/012-shadcn-design-system/quickstart.md] [why: visual-evidence]

**Checkpoint**: US1의 두 서브그룹이 PR1(T002~T006) → PR2(T007~T012) 순서로 머지되면, 앱은 시각 동등성 유지 + 신규 shadcn 컴포넌트 즉시 추가 가능한 상태. MVP 단독 배포 가능.

---

## Phase 4: User Story 2 - 폼 컴포넌트 Phase 1 마이그레이션 (Priority: P2)

**Goal**: 폼 컴포넌트 6종을 shadcn 기반으로 교체해 접근성·일관성 개선. 서버 액션·이벤트 시그니처 보존.

**Independent Test**: 실 플로우(로그인·여행 생성·활동 생성/수정·멤버 초대·오늘 이동·여행 탈퇴/삭제)에서 기능 회귀 없음. 키보드 내비 + Esc 트랩 정상. Server Action 시그니처 diff 0건. quickstart US2-1~US2-4 참조.

### Implementation for User Story 2

- [ ] T014 [P] [US2] `ActivityForm` 마이그레이션 — `src/components/ActivityForm.tsx`의 내부 마크업을 `Form`·`FormField`·`FormItem`·`Label`·`Input`·`Button` 등으로 교체. Server Action import 경로·호출 인자, `onSuccess`/`onCancel` props, `formData` key는 1:1 보존(contracts/component-api.md §2). [artifact: src/components/ActivityForm.tsx] [why: form-migration]
- [ ] T015 [P] [US2] `AuthButton` 마이그레이션 — `src/components/AuthButton.tsx`의 버튼을 `Button` variant로 교체. NextAuth `signIn`/`signOut` 호출 경로 보존. [artifact: src/components/AuthButton.tsx] [why: form-migration]
- [ ] T016 [P] [US2] `DeleteTripButton` 마이그레이션 — `src/components/DeleteTripButton.tsx`의 확인 단계를 shadcn `Dialog`로 교체, 트리거는 `Button variant="destructive"`. Server Action·redirect 경로 보존. [artifact: src/components/DeleteTripButton.tsx] [why: form-migration]
- [ ] T017 [P] [US2] `LeaveTripButton` 마이그레이션 — `src/components/LeaveTripButton.tsx` 동일 패턴(`Dialog` + `Button variant="destructive"`). Server Action 보존. [artifact: src/components/LeaveTripButton.tsx] [why: form-migration]
- [ ] T018 [P] [US2] `InviteButton` 마이그레이션 — `src/components/InviteButton.tsx`를 `Button` + `Dialog`(초대 URL 표시)로 재구성. 토큰 생성 Server Action·복사 UX 보존. [artifact: src/components/InviteButton.tsx] [why: form-migration]
- [ ] T019 [P] [US2] `TodayButton` 마이그레이션 — `src/components/TodayButton.tsx`를 `Button variant="secondary"` 또는 `ghost`로 교체. 스크롤·포커스 핸들러 보존. [artifact: src/components/TodayButton.tsx] [why: form-migration]
- [ ] T020 [US2] 미리보기 카탈로그에 폼 6종 섹션 추가 — `src/app/_dev/components/page.tsx`(또는 T011 확정 경로)에 "Migrated Forms" 섹션 신설, 6종을 더미 Server Action과 함께 렌더. [artifact: src/app/_dev/components/page.tsx] [why: form-migration]
- [ ] T021 [US2] US2 Evidence 수집 — quickstart US2-1~US2-4 실행. 실 플로우 한 사이클 녹화 또는 수동 체크, 375px 폼 스크린샷, Tab/Esc 키 동작 확인, Server Action 시그니처 grep diff 0건 증빙. quickstart.md 체크리스트 체크. [artifact: specs/012-shadcn-design-system/quickstart.md] [why: visual-evidence]

**Checkpoint**: US2 머지 시점 PR3. US1 PR2 이후 진입 가능. PR3 단독 머지로 폼 접근성·일관성 개선분 배포.

---

## Phase 5: User Story 3 - 디자이너 핸드오프 파이프라인 (Priority: P3)

**Goal**: `design/tokens.json`(DTCG) → `pnpm run tokens:build` → `globals.css @theme`의 자동 재생성 파이프라인 + GitHub Issue Forms 핸드오프 템플릿 + 개발자 단독 dry-run 검증.

**Independent Test**: (1) tokens.json 예시 존재, (2) `pnpm run tokens:build`로 CSS 변수 재생성, (3) Issue Forms 템플릿 선택 가능, (4) 개발자 dry-run 한 번 완주. quickstart US3-1~US3-4 참조.

### Implementation for User Story 3

#### Sub-group A: 토큰 빌드 파이프라인 ([why: tokens-build])

- [ ] T022 [P] [US3] 디자인 디렉토리 시드 `design/tokens.json` — 현행 Tailwind v4 `@theme` 팔레트(T004 산출물)를 W3C DTCG 형식으로 1:1 복제. 필수 카테고리(color·spacing·radius·shadow·fontFamily·fontSize·lineHeight) + shadcn 필수 alias(background·foreground·border·ring·primary-foreground·accent·accent-foreground·destructive·destructive-foreground·muted·muted-foreground·popover·popover-foreground·card·card-foreground) 포함. [artifact: design/tokens.json] [why: tokens-build]
- [ ] T023 [P] [US3] 디자이너용 편집 가이드 `design/README.md` — Tokens Studio plugin(Figma) export → `tokens.json` 갱신 → 개발자가 `pnpm run tokens:build` 실행 흐름 기술. DTCG 형식 링크. [artifact: design/README.md] [why: tokens-build]
- [ ] T024 [US3] `scripts/build-tokens.ts` 작성 — contracts/token-pipeline.md §2 준수. Style Dictionary로 `design/tokens.json` 파싱 → `src/app/globals.css`의 `/* BEGIN:tokens */` ~ `/* END:tokens */` sentinel 내부만 재작성. 필수 카테고리/alias 누락·JSON 파싱 실패·sentinel 부재 시 exit 1. 멱등성(재실행 diff 0). [artifact: scripts/build-tokens.ts] [why: tokens-build]
- [ ] T025 [US3] 의존성 추가 `style-dictionary@^4` 설치 — `package.json` devDependencies + `"tokens:build": "tsx scripts/build-tokens.ts"` 스크립트 등록. 기존 `tsx` devDep 재활용. [artifact: package.json] [why: tokens-build]
- [ ] T026 [US3] `src/app/globals.css`의 `@theme` 블록에 sentinel 주석 삽입 + 초기 빌드 결과 커밋 — `pnpm run tokens:build` 실행 → 생성된 `--color-*`·`--spacing-*` 등 변수가 sentinel 내부에 alphabetical 정렬로 배치. 수동 정의는 sentinel 밖에 유지. [artifact: src/app/globals.css] [why: tokens-build]

#### Sub-group B: 핸드오프 이슈 템플릿 ([why: handoff-template])

- [ ] T027 [US3] GitHub Issue Forms 템플릿 `.github/ISSUE_TEMPLATE/design-handoff.yml` — contracts/handoff-template.md §1 스키마대로 작성. 필수 필드 6종(Figma URL·스크린샷·Variants & States·인터랙션·데이터 바인딩·토큰 변경 여부) `required: true`. 자동 라벨 `design-handoff`. [artifact: .github/ISSUE_TEMPLATE/design-handoff.yml] [why: handoff-template]

#### Sub-group C: US3 Evidence

- [ ] T028 [US3] quickstart US3-1~US3-4 실행 — (1) tokens.json primary.500 임시 변경 → tokens:build → CSS 반영 확인 후 원복, (2) GitHub New Issue에서 핸드오프 템플릿 선택 스크린샷 `docs/evidence/012-shadcn-design-system/us3-2-template.png`, (3) tokens.json 리네임 후 빌드 실패(exit 1) 로그 캡처, (4) 개발자 단독 dry-run 한 번 실행 기록. quickstart.md 체크리스트 체크. [artifact: specs/012-shadcn-design-system/quickstart.md] [why: visual-evidence]

**Checkpoint**: US3 머지 시점 PR4. US1 PR2 이후 진입 가능(shadcn alias 변수 이름 확정 전제). PR5(US4)와 병행 가능.

---

## Phase 6: User Story 4 - 업무 프로세스 문서 (Priority: P4)

**Goal**: `docs/WORKFLOW.md`(7개 섹션) + `docs/design-handoff.md` 상세 + docs/README.md·CLAUDE.md·루트 README.md 상호 링크. AI 에이전트 권위 위임 명시.

**Independent Test**: (1) WORKFLOW.md 7섹션 존재, (2) 3 지점(docs/README.md·CLAUDE.md·README.md) 1홉 링크, (3) WORKFLOW.md → design-handoff.md 링크, (4) CLAUDE.md 권위 위임 문구. quickstart US4-1~US4-4 참조.

### Implementation for User Story 4

- [ ] T029 [P] [US4] `docs/WORKFLOW.md` 신설 — research R-8의 7개 섹션 순서대로 기술: 팀 구성·역할, 이슈 흐름, 버전·릴리즈 정책, 디자이너 협업 흐름, AI 에이전트 활용, 마일스톤 운영, 핫픽스 흐름. CLAUDE.md·DEVELOPMENT.md에서 중복되는 Git Flow·릴리즈 정책을 이주하거나 요약 인용(정본은 WORKFLOW.md). [artifact: docs/WORKFLOW.md] [why: workflow-docs]
- [ ] T030 [P] [US4] `docs/design-handoff.md` 신설 — 디자이너 도구 셋업(Figma + Tokens Studio), 산출물 형식(DTCG JSON, 스크린샷, 명세), 처리 절차(이슈 생성 → 개발자 assign → 변환 → 검수 → PR), 검토 체크포인트(도메인·접근성·시각 회귀·토큰 diff). handoff-template.md와 교차 링크. [artifact: docs/design-handoff.md] [why: workflow-docs]
- [ ] T031 [US4] `docs/README.md` 색인 갱신 — "협업·프로세스" 섹션 신설, `WORKFLOW.md`·`design-handoff.md` 1홉 링크 추가. "AI 에이전트 참조 가이드" 한 줄 안내. 기존 파일 구조·링크 보존. [artifact: docs/README.md] [why: workflow-docs]
- [ ] T032 [US4] `CLAUDE.md` 권위 위임 블록 추가 — "작업 규칙" 섹션 상단 또는 신규 "업무 프로세스" 섹션에 `docs/WORKFLOW.md` 단일 정본 명시 + AI 에이전트의 1차 참조 지침. 기존 "Git 워크플로우 규칙"·"릴리즈 프로세스" 중 중복 서술은 요약 + WORKFLOW.md 링크로 축약. [artifact: CLAUDE.md] [why: workflow-docs]
- [ ] T033 [US4] 루트 `README.md` 협업 모델 안내 추가 — 상단 소개 문단 직후 "협업 모델: 1인 BE + 디자이너 + AI 에이전트 하이브리드. 상세 — [docs/WORKFLOW.md](./docs/WORKFLOW.md)." 한 줄 삽입. 기존 콘텐츠 보존. [artifact: README.md] [why: workflow-docs]
- [ ] T034 [US4] quickstart US4-1~US4-4 실행 — (1) `rg "^## " docs/WORKFLOW.md` 결과 7섹션 헤더 순서 확인, (2) `rg "docs/WORKFLOW.md" docs/README.md CLAUDE.md README.md` 결과 3건 이상, (3) `rg "docs/design-handoff.md" docs/WORKFLOW.md` 결과 1건 이상, (4) CLAUDE.md 위임 문구 grep. quickstart.md 체크리스트 체크. [artifact: specs/012-shadcn-design-system/quickstart.md] [why: visual-evidence]

**Checkpoint**: US4 머지 시점 PR5. US1~US3과 독립 진행 가능. PR5 단독 머지로 협업 프로세스 정본 확립.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 릴리즈 준비 + 마일스톤 닫기 전 최종 검증.

- [ ] T035 [P] PR별 towncrier 단편 추가 — PR1(`changes/250.chore.md`, Tailwind 4 전환), PR2·PR3(`changes/270.feat.md`, shadcn 도입 + 마이그레이션), PR4(`changes/270.feat.md`에 병합 또는 별도 fragment), PR5(`changes/270.docs.md`). CI의 `towncrier-fragment-check` 통과. [artifact: changes/270.feat.md|changes/250.chore.md|changes/270.docs.md] [why: workflow-docs]
- [ ] T036 최종 통합 검증 — 모든 PR이 develop에 머지된 상태에서 `pnpm install` → `pnpm tsc --noEmit` → `pnpm build` → `pnpm test` → `pnpm lint` → `pnpm run tokens:build`(diff 0) 전건 통과. `rg "dark:|prefers-color-scheme" src/` 0건. quickstart.md 모든 체크박스 완료. [artifact: specs/012-shadcn-design-system/quickstart.md] [why: visual-evidence]

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup (T001)**: 즉시 시작 가능.
- **Phase 2 Foundational**: 해당 없음(US1이 기반 자체).
- **Phase 3 US1 (T002~T013)**: Setup 완료 후. Sub-group A(PR1) → Sub-group B(PR2) → Sub-group C(evidence) 순.
- **Phase 4 US2 (T014~T021)**: US1 Sub-group B(shadcn 초기 셋) 머지 후.
- **Phase 5 US3 (T022~T028)**: US1 Sub-group B 머지 후(shadcn alias 확정 전제). US2와 병행 가능(서로 다른 파일 집합).
- **Phase 6 US4 (T029~T034)**: US1~US3과 독립, Setup 완료 후 즉시 시작 가능.
- **Phase 7 Polish (T035~T036)**: 모든 US 완료 후.

### User Story Dependencies

- US1(P1): Setup 완료 후 즉시. PR1·PR2 순차.
- US2(P2): US1 PR2 머지 후.
- US3(P3): US1 PR2 머지 후. US2와 병행 가능.
- US4(P4): Setup 완료 후 즉시, 다른 US와 완전 독립.

### Within Each User Story

- US1 Sub-group A(PR1): T002 → T003 → T004 → T005 → T006 순차(package.json·postcss·css·config 교체 후 검증).
- US1 Sub-group B(PR2): T007 → T008/T009 → T010 → T011 → T012 순차.
- US1 Sub-group C: T013 (PR1·PR2 머지 후 evidence 수집).
- US2: T014~T019는 각각 다른 파일이므로 병렬(`[P]`). T020·T021은 순차.
- US3 Sub-group A: T022·T023 병렬 → T024 → T025 → T026 순차. Sub-group B: T027 독립. Sub-group C: T028 최종.
- US4: T029·T030 병렬 → T031·T032·T033 순차(T032는 CLAUDE.md 단일 파일이라 이주 순서 주의) → T034.

### Parallel Opportunities

- Phase 1: T001 단독(빈 디렉토리 생성).
- Phase 3 US1 Sub-group A: 파일 간 의존(`package.json`→`postcss`→`globals.css`→`tailwind.config.ts` 삭제)으로 순차.
- Phase 3 US1 Sub-group B: T008(utils.ts)·T009(shadcn add)는 서로 다른 파일군이라 이론상 병렬이나 shadcn CLI가 `src/lib/utils.ts`를 자동 생성하므로 실제로는 T007→T008/T009 순차가 안전.
- Phase 4 US2: T014~T019 6개 파일 병렬(`[P]`). 동시 처리 시 상당한 시간 단축.
- Phase 5 US3: T022·T023 병렬(서로 다른 파일). T027은 다른 그룹이라 T024·T025와 병렬 가능.
- Phase 6 US4: T029·T030 병렬.

---

## Parallel Example: User Story 2 (폼 6종 마이그레이션)

```bash
# T014~T019를 동시에 작업 세션으로 분배:
Task: "Migrate ActivityForm in src/components/ActivityForm.tsx (T014)"
Task: "Migrate AuthButton in src/components/AuthButton.tsx (T015)"
Task: "Migrate DeleteTripButton in src/components/DeleteTripButton.tsx (T016)"
Task: "Migrate LeaveTripButton in src/components/LeaveTripButton.tsx (T017)"
Task: "Migrate InviteButton in src/components/InviteButton.tsx (T018)"
Task: "Migrate TodayButton in src/components/TodayButton.tsx (T019)"
# 완료 후 T020(미리보기 통합), T021(evidence) 순차
```

---

## Implementation Strategy

### MVP (US1만)

1. Phase 1 Setup(T001) → Phase 3 Sub-group A(T002~T006, PR1 머지) → Sub-group B(T007~T012, PR2 머지) → Sub-group C(T013 evidence).
2. 이 시점에서 앱은 Tailwind v4 + shadcn 초기 셋으로 전환 완료. 폼 마이그레이션 없이도 "신규 컴포넌트 즉시 추가" 가치 성립.
3. 데모·배포 가능. 후속 US는 선택.

### Incremental Delivery

1. **PR1 (T002~T006)**: Tailwind v4 전환. dev 환경 배포 후 회귀 확인 → develop 머지.
2. **PR2 (T007~T012)**: shadcn 초기 셋. PR1 머지 후 진행 → develop 머지. 여기까지 US1 완료.
3. **PR3 (T014~T021)**: 폼 6종 마이그레이션. PR2 머지 후 진행 → develop 머지. US2 완료.
4. **PR4 (T022~T028)**: 토큰 빌드 + 핸드오프 템플릿. PR2 머지 후 PR3과 병행 가능 → develop 머지. US3 완료.
5. **PR5 (T029~T034)**: 업무 프로세스 문서. PR1 이전이라도 시작 가능하나 릴리즈 정책 이주 문구가 WORKFLOW.md로 들어가므로 다른 PR 진행 중 병행 → develop 머지. US4 완료.
6. **Polish (T035, T036)**: PR별 단편 추가 + 최종 통합 검증. 마일스톤 close 신호.

### 워크트리 분할 전략

다른 Claude Code 세션에서 독립 워크트리로 진행 가능:

- 세션 A: US1 + US2(순차)
- 세션 B: US4(완전 독립 문서 작업)
- 세션 C: US3(US1 PR2 머지 후 합류)

---

## Notes

- [P] 태스크 = 다른 파일, 선행 의존 없음.
- [Story] 라벨로 user story 추적.
- 각 PR은 독립 배포 가능해야 함. dev.trip.idean.me 회귀 확인 후 다음 PR 진입.
- shadcn CLI 실행 시 `components.json`의 경로가 정확히 설정돼야 자동 vendoring이 올바른 디렉토리로 들어감.
- T024의 Style Dictionary는 v4(2024+) + ESM. `tsx`로 직접 실행하므로 빌드 래퍼 불필요.
- T032의 CLAUDE.md 편집은 기존 "Git 워크플로우 규칙" 섹션과 중복되는 부분이 있어 요약·링크로 정리한다(삭제가 아님). 세션 종료 후 update-agent-context.sh 재실행이 필요할 수 있음.
- T027 이슈 템플릿 파일명은 `design-handoff.yml`로 고정(대소문자·하이픈 엄수). GitHub UI가 인식하지 못하면 저장소 settings에서 Issues 기능 활성화 확인.
- T028의 dry-run은 실 이슈·PR 생성 없이 local 절차 실행만으로도 충분. 기록은 quickstart.md 코멘트로 남김.
