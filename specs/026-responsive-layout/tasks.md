# Tasks: 데스크탑·모바일 반응형 근본 대응

**Input**: Design documents from `/specs/026-responsive-layout/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Organization**: 묶음 A~E (plan.md Phase 0 R7) 단위로 자식 이슈가 만들어지도록 phase·[why] 정렬. 각 phase가 머지 가능한 단위.

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

- **[P]**: 같은 파일을 만지지 않고 서로 의존이 없는 태스크에만 부여
- **[Story]**: US1·US2·US3·US4 (spec.md 매핑)
- 묶음 식별은 `[why]` 태그(plan Coverage Targets 키와 1:1)

## Path Conventions

Next.js App Router 단일 프로젝트. `src/app/`, `src/components/`, `src/styles/`(또는 `src/app/globals.css`), `tokens/`, `tests/`.

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 차일드 이슈 본문 초안 5건 작성 — 묶음 A~E 자식 이슈 작성 [artifact: specs/026-responsive-layout/child-issues.md] [why: tokens-foundation]

---

## Phase 2: Foundational — 묶음 A: 토큰 정비 (Blocking Prerequisites)

**Goal**: 디자인 토큰 SSOT에 breakpoint·container·grid·gap 키를 정식화. 본 phase 완료 전 다른 묶음 진행 불가.

**Independent Test**: `git grep -E 'max-w-\\[[0-9]+px\\]' src/app src/components` 결과 0건 (예외는 코멘트로 사유 명시) + `npx style-dictionary build`가 무결성 통과.

- [x] T010 [US2] design tokens SSOT에 breakpoint 토큰 추가 (`--breakpoint-mobile/tablet/desktop/wide`) [artifact: design/tokens.json] [why: tokens-foundation]
- [x] T011 [US2] design tokens SSOT에 container max-width 토큰 추가 (`--container-narrow/content/wide`) [artifact: design/tokens.json] [why: tokens-foundation]
- [x] T012 [US2] design tokens SSOT에 grid·gap 토큰 추가 (`--spacing-grid-tight/comfy`) [artifact: design/tokens.json] [why: tokens-foundation]
- [x] T013 [P] [US2] `npm run tokens:build` 실행으로 globals.css `BEGIN:tokens` 블록 생성 [artifact: src/app/globals.css] [why: tokens-foundation]
- [x] T014 [P] [US2] 토큰 키 존재·값 sanity 자체 테스트 추가 [artifact: tests/lib/tokens/tokens-presence.test.ts] [why: tokens-foundation]
- [x] T015 [US2] `/docs` 페이지의 max-w-screen-2xl을 토큰 기반 `max-w-wide`로 치환 [artifact: src/app/docs/page.tsx] [why: tokens-foundation]

**Checkpoint**: 토큰 SSOT가 모든 신규·기존 페이지의 1차 출처. 다음 phase부터 페이지가 임의 px 사용 금지.

---

## Phase 3: User Story 1 — 묶음 B: trip 상세 다단 (P1)

**Story Goal**: 데스크탑 ≥1024px에서 `/trips/[id]`가 본문(2/3) + 사이드(1/3) 다단 노출. 모바일 회귀 없음.

**Independent Test**: 데스크탑 1440px에서 본문/사이드 비율 시각 확인 + 모바일 375px에서 v2.12.x 스크린샷 diff 0. quickstart.md Scenario D-1~D-4.

- [x] T020 [US1] trip 상세 page layout wrapper에 `grid lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]` 분기 적용 [artifact: src/app/trips/<id>/page.tsx] [why: trip-detail-layout]
- [x] T021 [US1] 사이드 패널 컴포넌트 분리 (캘린더 3종 + MemberList) [artifact: src/app/trips/<id>/SidePanel.tsx] [why: trip-detail-layout]
- [x] T022 [P] [US1] 글로벌 layout `<main>` 폭을 `lg:max-w-wide`로 확장 (모바일은 max-w-2xl 유지) [artifact: src/app/layout.tsx] [why: trip-detail-layout]
- [x] T023 [P] [US1] 분기 클래스 정적 검증 단위 테스트 [artifact: tests/app/trips-id/layout-classes.test.ts] [why: trip-detail-layout]

**Checkpoint**: trip 상세 P1 완료 — 단독 머지 가능, MVP 가치 제공.

---

## Phase 4: User Story 3-a — 묶음 C: trip 목록 + 캘린더 모달 (P2)

**Story Goal**: `/trips` 카드 그리드 ≥1024px에서 2~3열 + GCalLinkPanel 다이얼로그 데스크탑 폭 제어.

**Independent Test**: 데스크탑 1440px에서 카드 다단 + 모달 폭 ≤720px 중앙 정렬, 모바일에서는 1열·풀폭 모달. quickstart Scenario L-1·L-2·G-1·G-2.

- [x] T030 [US3] `/trips` 카드 컨테이너에 `grid lg:grid-cols-2 xl:grid-cols-3 gap-grid-tight lg:gap-grid-comfy` 분기 적용 [artifact: src/app/trips/page.tsx] [why: trip-list-grid]
- [x] T031 [P] [US3] 카드는 인라인 정의 그대로 — 그리드 셀에서 폭 자동 흡수. 별 컴포넌트 분리 불필요로 판단(범위 축소) [artifact: src/app/trips/page.tsx] [why: trip-list-grid]
- [x] T032 [US3] GCalLinkPanel `DialogContent` 5건 모두 `sm:max-w-narrow` override (기본 sm:max-w-sm 좁음 회피) [artifact: src/components/GCalLinkPanel.tsx] [why: gcal-dialog-width]
- [x] T033 [P] [US3] 그리드·모달 분기 정적 회귀 테스트 [artifact: tests/app/trips/list-grid.test.ts|tests/components/GCalLinkPanel.dialog-width.test.ts] [why: gcal-dialog-width]

**Checkpoint**: 목록·모달 P2 완료 — 토큰 위에서 작성됐는지 grep으로 재확인.

---

## Phase 5: User Story 3-b·4 — 묶음 D: Form + NavBar (P2·P3)

**Story Goal**: 활동 편집·생성 Form 데스크탑 2열 + 글로벌 NavBar 데스크탑 가로 액션.

**Independent Test**: 1440px에서 폼 2열·NavBar 가로 노출, 375px에서 폼 1열·NavBar 햄버거 유지. quickstart Scenario F-1·N-1.

- [ ] T040 [US3] ActivityForm 입력 그리드를 `grid sm:grid-cols-1 lg:grid-cols-2 gap-[var(--grid-gap-comfy)]` 로 분기 [artifact: src/components/ActivityForm.tsx] [why: activity-form-density]
- [ ] T041 [P] [US3] Form 라벨·도움말 정렬을 데스크탑 2열에 맞춰 보정 [artifact: src/components/ActivityForm.tsx] [why: activity-form-density]
- [ ] T042 [US4] NavBar 액션을 `hidden lg:flex` 로 가로 노출, 모바일 햄버거는 `flex lg:hidden` 으로 유지 [artifact: src/components/NavBar.tsx] [why: navbar-desktop]
- [ ] T043 [P] [US4] NavBar·Form 분기 클래스 존재 검증 자체 테스트 [artifact: tests/components/NavBar.test.tsx|tests/components/ActivityForm.test.tsx] [why: navbar-desktop]

**Checkpoint**: 입력·내비게이션 표면 정비 완료.

---

## Phase 6: Polish — 묶음 E: 모바일 회귀 점검 + 문서

**Goal**: 작업 대상 6종 페이지·컴포넌트 × 3 폭(375·414·768) 시각 회귀 검증 + Evidence 정리.

**Independent Test**: quickstart.md Scenario R-1 체크리스트 모두 체크.

- [ ] T050 [US1] 모바일 회귀 스크린샷 캡처 (trip 상세·trip 목록·GCal 모달·ActivityForm·NavBar) [artifact: docs/evidence/026-responsive-layout/regression-summary.md] [why: mobile-regression]
- [ ] T051 [P] quickstart.md Evidence 체크리스트 완료 마킹 [artifact: specs/026-responsive-layout/quickstart.md] [why: mobile-regression]
- [ ] T052 [P] `git grep -E 'max-w-\\[[0-9]+px\\]' src/app src/components` 결과를 evidence에 첨부 (예외 사유 포함) [artifact: docs/evidence/026-responsive-layout/grep-px-residual.md] [why: mobile-regression]

---

## Dependencies

```
Phase 1 Setup
  └─ Phase 2 Foundational (묶음 A: 토큰)
       ├─ Phase 3 (묶음 B: trip 상세 P1)
       ├─ Phase 4 (묶음 C: 목록·모달 P2)         [A 완료 후 병렬 가능]
       ├─ Phase 5 (묶음 D: Form·NavBar P2·P3)    [A 완료 후 병렬 가능]
       └─ Phase 6 (묶음 E: 회귀 점검)            [B~D 머지 후]
```

- **Phase 2 (묶음 A)** 가 모든 후속 phase 의 blocking prereq.
- Phase 3·4·5 는 A 머지 후 서로 병렬 진행 가능. 단 각 페이지가 토큰 키만 참조하는지 PR review 시 확인.
- Phase 6 (회귀 점검)은 B·C·D 머지 후 한 라운드로 진행.

## Parallel Examples

- Phase 2 안에서 T013(Style Dictionary 소스)·T014(토큰 테스트)는 T010~T012 변경과 별도 파일이라 병렬.
- Phase 3·4·5 는 서로 별도 페이지/컴포넌트라 묶음 단위로 동시 작업 가능.

## Implementation Strategy

- **MVP**: Phase 2 (토큰) + Phase 3 (trip 상세). 본 두 phase 머지가 가장 큰 사용자 가치(매일 쓰는 화면 데스크탑 다단) 제공.
- **Increment 2**: Phase 4 (목록·모달).
- **Increment 3**: Phase 5 (Form·NavBar).
- **Closeout**: Phase 6 회귀 점검 + 릴리즈 v2.13.0.

## 자식 이슈 매핑 (toggle-merge 흐름)

| 묶음 | Phase | [why] | 자식 이슈 후보 제목 |
|------|-------|-------|---------------------|
| A | 2 | tokens-foundation | feat(026/A): 디자인 토큰 SSOT — breakpoint·container·grid·gap |
| B | 3 | trip-detail-layout | feat(026/B): trip 상세 데스크탑 다단 |
| C | 4 | trip-list-grid·gcal-dialog-width | feat(026/C): trip 목록 카드 그리드 + 캘린더 모달 폭 |
| D | 5 | activity-form-density·navbar-desktop | feat(026/D): 활동 폼 2열 + NavBar 데스크탑 액션 |
| E | 6 | mobile-regression | chore(026/E): 모바일 회귀 점검 + 토큰 잔존 px grep |
