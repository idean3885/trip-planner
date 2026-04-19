---
description: "Task list for feature 014: 공개 랜딩 페이지 & 문서 체계 개편"
---

# Tasks: 공개 랜딩 페이지 & 문서 체계 개편

**Input**: Design documents from `/specs/014-landing-docs-refresh/`
**Prerequisites**: plan.md (✓), spec.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓), quickstart.md (✓)

**Tests**: 본 피처는 핵심 비즈니스 로직이 아닌 공개 UI·문서 재구성이므로, 테스트는 **라우트 계약(공개/리디렉트)과 콘텐츠 스키마**에 한정한다. 랜딩 전체 렌더·접근성은 e2e/Lighthouse로 커버.

**Organization**: 작업은 user story 단위로 그룹화된다. US2(README)·US3(docs)·US4(루트)는 US1(랜딩)과 **독립 병렬 가능**하다.

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

- **[P]**: 서로 다른 파일·의존성 없음 → 병렬 가능
- **[Story]**: US1/US2/US3/US4
- **[artifact]**: 산출 파일 상대 경로(저장소 루트 기준). 복수 경로는 `|`로 연결
- **[why]**: plan.md Coverage Targets의 태그와 일치 — plan↔tasks 커버리지 검증 대상

## Path Conventions

단일 Next.js 프로젝트(Option 1 변형). 루트 기준 `src/`, `tests/`, `public/`, `docs/`, `scripts/`, `changes/`.

---

## Phase 1: Setup

**Purpose**: 본 피처는 기존 v2.5.0 shadcn Phase 2 인프라를 그대로 재사용한다. 신규 Setup 작업 없음.

- [ ] T001 `public/landing/` 자산 디렉터리 준비(키퍼 파일 추가) [artifact: public/landing/.gitkeep] [why: landing-content]

---

## Phase 2: Foundational

**Purpose**: 본 피처는 데이터 스키마·공용 인증 변경이 없다. 미들웨어 공개 경로 확장은 US1 내부 태스크로 귀속.

*(Foundational 태스크 없음)*

**Checkpoint**: 바로 user story 작업 시작 가능.

---

## Phase 3: User Story 1 — 외부 방문자가 랜딩만 보고 프로젝트를 이해한다 (P1) 🎯 MVP

**Goal**: 비로그인 방문자가 `/`에서 로그인 없이 프로젝트 정체성·가치·기능·기술 스택·데모·로그인 CTA를 한 페이지로 본다.

**Independent Test**: 시크릿 창에서 `/` 접근 시 200 OK + Hero `<h1>` 렌더 + 저장소/로그인 CTA가 1클릭으로 동작(quickstart US1-1~US1-7).

### Implementation for User Story 1

#### landing-route (공개 라우트 전환 + 대시보드 이관)

- [ ] T002 [US1] `src/middleware.ts`의 `isPublicRoute` 판정에 `pathname === "/"` 추가 [artifact: src/middleware.ts] [why: landing-route]
- [ ] T003 [US1] `src/app/page.tsx` 재구성: 비로그인=랜딩 렌더, 로그인=`redirect("/trips")`. 현 대시보드 로직을 `src/app/trips/page.tsx`로 이관 [artifact: src/app/page.tsx|src/app/trips/page.tsx] [why: landing-route]

#### landing-content (섹션별 컴포넌트)

- [ ] T004 [P] [US1] Hero 섹션 컴포넌트(projectMeta 재사용, primary/secondary CTA) [artifact: src/components/landing/Hero.tsx] [why: landing-content]
- [ ] T005 [P] [US1] ValueProps 섹션 컴포넌트(3~5 카드, lucide 아이콘) [artifact: src/components/landing/ValueProps.tsx] [why: landing-content]
- [ ] T006 [P] [US1] FeatureHighlights 섹션 컴포넌트(2~3 기능 주제) [artifact: src/components/landing/FeatureHighlights.tsx] [why: landing-content]
- [ ] T007 [P] [US1] TechStack 섹션 컴포넌트(카테고리 배지 격자) [artifact: src/components/landing/TechStack.tsx] [why: landing-content]
- [ ] T008 [P] [US1] DemoShowcase 섹션 컴포넌트 + 데스크톱·모바일 스크린샷 자산 배치 [artifact: src/components/landing/DemoShowcase.tsx|public/landing/trip-list-desktop.png|public/landing/trip-detail-mobile.png] [why: landing-content]
- [ ] T009 [P] [US1] BottomCta + LandingFooter 컴포넌트(로그인·저장소·문서 3축) [artifact: src/components/landing/BottomCta.tsx|src/components/landing/LandingFooter.tsx] [why: landing-content]
- [ ] T010 [US1] Landing 컨테이너 + 콘텐츠 데이터 소스(`landing-content.ts` 배열로 단일 정의) [artifact: src/components/landing/LandingPage.tsx|src/lib/landing-content.ts] [why: landing-content]

#### landing-ds (디자인 시스템 일관성)

- [ ] T011 [US1] 랜딩 모든 섹션이 shadcn 토큰·컴포넌트만 사용하도록 감사(하드코딩 색상·간격 0, `rounded-card`·`shadow-card` 등 레거시 유틸 0) [artifact: src/components/landing/] [why: landing-ds]

#### landing-a11y (접근성·JS 비활성·SEO)

- [ ] T012 [US1] `/` 메타태그(`metadata` 객체: title/description/openGraph/twitter) + Hero OG 이미지 자산 [artifact: src/app/page.tsx|public/landing/hero-og.png] [why: landing-a11y]

**Checkpoint**: US1 단독 완성 — 비로그인 방문자가 랜딩을 정상 열람 가능.

---

## Phase 4: User Story 2 — README 하나로 탐색 동선 파악 (P1)

**Goal**: 외부 방문자가 GitHub 저장소에 도달했을 때 README 한 번으로 3층 독자 동선을 파악하고 1클릭 이내 각 목적지로 이동한다.

**Independent Test**: README에서 `trip.idean.me` 노출 ≤ 2회, 3층 독자 헤더 모두 존재, 각 목적지 링크 1클릭 이내.

### Implementation for User Story 2

- [ ] T013 [US2] README.md 재구성(히어로·정체성 3줄·독자 3층 섹션·빠른 시작 요약·링크 표) — trip.idean.me 링크 히어로 + 링크 표 2회만 유지 [artifact: README.md] [why: readme-refresh]
- [ ] T014 [US2] README 구조 검증 스크립트(grep 기반 — 노출 횟수·3층 헤더·필수 링크 확인) [artifact: scripts/check-readme-schema.sh] [why: readme-refresh]

**Checkpoint**: US1 + US2 모두 독립 가동.

---

## Phase 5: User Story 3 — docs/ 독자별 진입점 (P2)

**Goal**: docs/에 들어온 독자가 엔트리 목차에서 자기 역할 섹션으로 1~2클릭 안에 목표 문서에 도달한다. 각 문서 상단에 대상 독자가 명시돼 있다.

**Independent Test**: docs/README.md 3층 헤더 존재, `check-docs-reader-header.sh` 통과, `docs/spec.md` → audits 이관 후 내부 참조 0건.

### Implementation for User Story 3

#### docs-entry

- [ ] T015 [US3] `docs/README.md` 엔트리 신설(독자 3층 목차, 각 항목에 1줄 요약) [artifact: docs/README.md] [why: docs-entry]

#### docs-reader-tag (각 문서 상단 독자 명시)

- [ ] T016 [P] [US3] 기여자·개발자 그룹 문서 상단 독자 헤더 추가(ARCHITECTURE/DEVELOPMENT/DOMAIN/ERD/design-handoff) [artifact: docs/ARCHITECTURE.md|docs/DEVELOPMENT.md|docs/DOMAIN.md|docs/ERD.md|docs/design-handoff.md] [why: docs-reader-tag]
- [ ] T017 [P] [US3] 운영·감사 및 공통 그룹 문서 상단 독자 헤더 추가(ENVIRONMENTS/WORKFLOW + audits/evidence/research 각 README 또는 대표 문서) [artifact: docs/ENVIRONMENTS.md|docs/WORKFLOW.md] [why: docs-reader-tag]
- [ ] T018 [US3] 문서 헤더 검증 스크립트(`docs/**/*.md`에서 `> **대상 독자**:` 패턴 강제) [artifact: scripts/check-docs-reader-header.sh] [why: docs-reader-tag]

#### docs-dedup

- [ ] T019 [US3] `docs/spec.md`(v1 레거시) → `docs/audits/2026-04-v1-spec-snapshot.md` 이관 + 상단 "역사적 기록" 안내 + 저장소 내 구 경로 참조 갱신 [artifact: docs/audits/2026-04-v1-spec-snapshot.md] [why: docs-dedup]

**Checkpoint**: US1 + US2 + US3 모두 독립 가동.

---

## Phase 6: User Story 4 — 루트 레거시 safe 제거 (P3, 선택)

**Goal**: 저장소 루트 첫인상이 깔끔해진다. 제거된 파일 각각은 현재 어떤 배포·빌드·도구에서도 참조되지 않음이 확인된다.

**Independent Test**: 제거 후 `npm run build` + `npm test` + `npm run test:e2e` 통과, 감사 기록 파일 존재.

### Implementation for User Story 4

- [ ] T020 [US4] 루트 레거시 safe 제거(파일별 grep 검증 → 제거/이관 → 개별 커밋 → 감사 기록 파일 작성). 대상: `02_honeymoon_plan.md`(개인), `_config.yml`·`index.md`(Jekyll 잔재, Pages 비활성 확인 시), 기타 grep 0건 파일 [artifact: docs/audits/2026-04-root-legacy-audit.md] [why: root-legacy]

**Checkpoint**: 선택 트랙 완료 또는 후속 이슈로 보류.

---

## Phase 7: Polish & Cross-Cutting (Evidence · 테스트)

**Purpose**: quickstart.md Evidence 채움 + 자동 테스트 + 릴리즈 산출물.

- [ ] T021 [P] e2e 테스트: `/` 공개 라우트, 비로그인 200, 로그인 307→`/trips`, 저장소 링크, 로그인 CTA callbackUrl [artifact: tests/e2e/landing.spec.ts] [why: landing-route]
- [ ] T022 [P] 단위 테스트: middleware `isPublicRoute` 판정 케이스(`/`·`/trips`·`/auth/signin` 등) [artifact: tests/unit/middleware.spec.ts] [why: landing-route]
- [ ] T023 [P] 단위 테스트: Landing 콘텐츠 스키마 검증(ValueProp.title 길이, TechStack ≤ 12, ScreenshotRef.alt 비어있지 않음) [artifact: tests/unit/landing-content.spec.ts] [why: landing-content]
- [ ] T024 [P] Lighthouse 실행 스크립트 + 결과 기록 [artifact: scripts/lighthouse-landing.sh|docs/evidence/014-landing-docs-refresh/us1-lighthouse.json] [why: landing-a11y]
- [ ] T025 [P] 데모 스크린샷 캡처 스크립트(Playwright 헤드리스, 데스크톱 1440/모바일 390) [artifact: scripts/capture-landing-shots.ts] [why: landing-content]
- [ ] T026 [P] quickstart US1 Evidence 기입(체크박스 체크 + 스크린샷 경로 갱신) [artifact: specs/014-landing-docs-refresh/quickstart.md] [why: landing-a11y]
- [ ] T027 [P] quickstart US2 Evidence 기입(check-readme-schema 실행 결과) [artifact: specs/014-landing-docs-refresh/quickstart.md] [why: readme-refresh]
- [ ] T028 [P] quickstart US3 Evidence 기입(check-docs-reader-header 실행 결과) [artifact: specs/014-landing-docs-refresh/quickstart.md] [why: docs-reader-tag]
- [ ] T029 [P] quickstart US4 Evidence 기입(실행된 경우에만 — 보류 시 "deferred" 명시) [artifact: specs/014-landing-docs-refresh/quickstart.md] [why: root-legacy]
- [ ] T030 towncrier 단편(feat) 추가 — 랜딩 페이지 + 문서 재정비 1건으로 묶기 [artifact: changes/+landing-docs-refresh.feat.md] [why: landing-content]

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup (T001)**: 독립 실행. 다른 태스크 선행 없음.
- **Phase 2 Foundational**: 태스크 없음 — 스킵.
- **Phase 3 US1**: T002·T003 완료 후 T004~T012가 병렬 진행 가능. T010은 T004~T009의 결과물을 조립하므로 마지막.
- **Phase 4 US2**: Phase 3와 **독립 병렬**.
- **Phase 5 US3**: Phase 3와 **독립 병렬**.
- **Phase 6 US4**: Phase 3·4·5 완료 후 권장(빌드/테스트 회귀 영향 최소화).
- **Phase 7 Polish**: 관련 Phase 완료 후 각 Evidence 채움 태스크 시작.

### User Story 상호 독립성

- US1·US2·US3은 서로 다른 디렉터리(`src/`·`README.md`·`docs/`)를 건드리므로 충돌 없음.
- US4는 루트 파일 삭제이므로 단독 커밋으로 분리, 다른 US와 공존 가능.

### Within User Story 1 (병렬 기회)

- T004 ~ T009(각 섹션 컴포넌트)는 서로 다른 파일 → 전부 병렬.
- T010(조립) 만 T004 ~ T009 이후.
- T011(디자인 감사) 은 T010 이후.
- T012(메타태그) 는 T003 이후 언제든.

---

## Parallel Example: User Story 1 섹션 구현

```bash
# T002·T003 완료 직후:
Task: "Hero 섹션 컴포넌트(projectMeta 재사용)"                        # T004
Task: "ValueProps 섹션 컴포넌트"                                     # T005
Task: "FeatureHighlights 섹션 컴포넌트"                              # T006
Task: "TechStack 섹션 컴포넌트"                                      # T007
Task: "DemoShowcase 섹션 + 스크린샷 자산"                            # T008
Task: "BottomCta + LandingFooter"                                    # T009
```

---

## Implementation Strategy

### MVP (US1 단독)

1. T001 → T002 → T003 (라우트 전환과 대시보드 이관)
2. T004 ~ T009 병렬 (섹션 컴포넌트)
3. T010 조립 → T011 디자인 감사 → T012 메타태그
4. T021·T022 테스트 → T024 Lighthouse → T025 스크린샷 → T026 US1 Evidence
5. **STOP & VALIDATE**: 비로그인 `/` 렌더 확인 + Lighthouse ≥ 90

### Incremental Delivery (마일스톤 단일 PR 또는 트랙별 분리)

- Option A (단일 PR): 모든 US를 한 PR로 묶어 v2.6.0 1회 릴리즈
- Option B (분리): US1 + US2를 먼저 PR → dev 배포로 어필 가능 시점 확보 → US3·US4 후속 PR

v2.6.0 마일스톤 특성(포트폴리오 어필)상 **Option A 권장** — 하나의 릴리즈로 "개편 완료"를 선언하는 편이 커뮤니케이션에 유리.

### 병렬 전략(AI 보조 1인 개발)

- 랜딩 본체(US1) 구현 중 문서 작업(US2·US3)은 별도 커밋으로 병행 가능.
- US4(루트 정리)는 빌드/테스트에 영향 있을 수 있어 가장 마지막에 단독 커밋.

---

## Notes

- `[artifact]`에 복수 경로가 필요한 태스크는 `|`로 연결(예: `src/app/page.tsx|src/app/trips/page.tsx`).
- `[why]`는 plan.md Coverage Targets와 정확히 일치. `landing-content`·`landing-route`는 `[multi-step]` 충족을 위해 복수 태스크가 묶여 있음.
- T030의 towncrier 단편 파일명 prefix `+`는 "non-issue-specific" — 이슈 분할(merge-tasks-to-issues.sh) 후 실제 이슈 번호로 rename 가능.
- US4는 선택 트랙이므로 Evidence(T029)도 "deferred" 기재가 허용된다.
