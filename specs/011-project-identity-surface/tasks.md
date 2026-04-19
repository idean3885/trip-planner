---

description: "Task list for 011-project-identity-surface"
---

# Tasks: 프로젝트 아이덴티티 표면 구축

**Input**: Design documents from `/specs/011-project-identity-surface/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/ui-surface.md](./contracts/ui-surface.md), [quickstart.md](./quickstart.md)

**Tests**: spec·plan에서 자동 테스트 명시 요구 없음. `tsc --noEmit`이 타입 기반 계약을 검증하고 나머지는 quickstart 수동 증거로 커버한다. TDD·단위 테스트 태스크는 포함하지 않는다.

**Organization**: 태스크는 User Story 단위로 묶여 독립 구현·독립 배포가 가능하다. PR 분할은 quickstart의 Rollout 순서를 따른다.

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

- **[P]**: 다른 파일, 선행 태스크와 충돌 없어 병렬 가능
- **[Story]**: 해당 태스크가 소속된 User Story (US1/US2/US3)
- **[artifact]**: 산출 파일 상대 경로 또는 `path::symbol`
- **[why]**: plan의 Coverage Target과 일치하는 그룹 태그

## Path Conventions

Next.js App Router 단일 앱 구조. 소스 경로는 `src/` 기준, 저장소 루트 경로는 본 워크트리(`/Users/nhn/git-project/idean3885/trip-planner-200/`) 기준.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 본 피처 전용 공유 인프라. 신규 npm 의존성 없음.

- [ ] T001 스크린샷 수집용 디렉토리 생성 `docs/evidence/011-project-identity-surface/` (빈 `.gitkeep`) [artifact: docs/evidence/011-project-identity-surface/.gitkeep] [why: visual-evidence]

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: US1·US2가 공통으로 참조하는 프로젝트 메타 소스. US3는 참조하지 않으므로 미선행 가능이나, 동일 피처 스코프이므로 순서상 먼저 둔다.

**⚠️ CRITICAL**: US1(풋터)·US2(About) 모두 이 모듈을 import하므로 선행 필수.

- [ ] T002 프로젝트 메타 타입·상수 작성 `src/lib/project-meta.ts` — `ProjectMeta` 타입 + `projectMeta` `as const satisfies ProjectMeta` 객체. 필드는 data-model.md 정의 그대로. [artifact: src/lib/project-meta.ts::projectMeta] [why: meta-source]
- [ ] T003 `tsc --noEmit` 실행으로 T002의 타입 정합성 확인. 실패 시 T002 수정 후 재실행. [artifact: src/lib/project-meta.ts] [why: meta-source]

**Checkpoint**: `projectMeta`가 타입 안전하게 export되면 US1·US2 진입 가능.

---

## Phase 3: User Story 1 - 전역 풋터 (Priority: P1) 🎯 MVP

**Goal**: 모든 공개 페이지 하단에 프로젝트 출처·GitHub·API Docs 링크를 노출.

**Independent Test**: 5개 경로(`/`, `/docs`, `/settings`, `/trips/<id>`, 짧은 콘텐츠 페이지)에 접속해 풋터 렌더·링크 동작·모바일 wrap·sticky 동작 확인 (quickstart US1-1~US1-4).

### Implementation for User Story 1

- [ ] T004 [US1] `Footer` 서버 컴포넌트 작성 `src/components/Footer.tsx` — `projectMeta` import, contracts/ui-surface.md §1 DOM 표면 준수, 외부 링크 `target="_blank" rel="noopener noreferrer"`, flex-wrap 레이아웃, About 링크 미포함(US2 배포 시 추가). [artifact: src/components/Footer.tsx] [why: footer] [multi-step: 2]
- [ ] T005 [US1] 루트 레이아웃 수정 `src/app/layout.tsx` — `<body>`에 `flex flex-col` 추가, 기존 메인 콘텐츠 래퍼에 `flex-1` 적용, 말미에 `<Footer />` 삽입. 기존 SessionProvider/AuthButton 구조 보존. [artifact: src/app/layout.tsx] [why: footer] [multi-step: 2]
- [ ] T006 [US1] 로컬 dev 서버 기동 후 quickstart US1-1~US1-4 수동 체크리스트 실행. 스크린샷 `docs/evidence/011-project-identity-surface/us1-3-mobile.png`, `us1-4-sticky.png` 수집. quickstart.md 체크박스 업데이트. [artifact: specs/011-project-identity-surface/quickstart.md] [why: visual-evidence]

**Checkpoint**: US1 단독 머지 가능(PR #1). About 페이지 없이도 풋터만으로 MVP 성립.

---

## Phase 4: User Story 2 - About 페이지 (Priority: P2)

**Goal**: `/about` 공개 페이지에서 프로젝트 배경·저작자·기술 스택·라이선스·GitHub 링크 확인.

**Independent Test**: `/about` 직접 접속 → 200 응답, 모든 필드 노출, 모바일 가독성, `projectMeta` 참조 일관성 확인 (quickstart US2-1~US2-4).

### Implementation for User Story 2

- [ ] T007 [US2] About 페이지 작성 `src/app/about/page.tsx` — contracts/ui-surface.md §2 DOM 구조 준수, 모든 표시 값을 `projectMeta`에서 import, `max-w-2xl mx-auto` 단일 컬럼, 외부 링크 `rel` 규약 적용. [artifact: src/app/about/page.tsx] [why: about-page]
- [ ] T008 [US2] 풋터에 About 링크 추가 `src/components/Footer.tsx` — 기존 링크들 사이에 `<Link href="/about">About</Link>` 삽입. US1의 "About 미노출" 규약은 본 태스크에서 해제. [artifact: src/components/Footer.tsx::Footer] [why: footer]
- [ ] T009 [US2] 로컬 dev 서버에서 quickstart US2-1~US2-4 실행. 스크린샷 `us2-3-mobile.png` 수집. quickstart.md 체크박스 업데이트. [artifact: specs/011-project-identity-surface/quickstart.md] [why: visual-evidence]

**Checkpoint**: US2 머지 시점 PR #2(PR #1 선행 전제). About 페이지와 풋터 "About" 링크 동시 배포로 깨진 링크 방지.

---

## Phase 5: User Story 3 - 설정 페이지 API 문서 진입점 (Priority: P3)

**Goal**: 설정 페이지 상단에 `/docs`로 이동하는 API 문서 링크 추가.

**Independent Test**: 로그인 상태 `/settings` 접속 → 상단에 "API 문서 →" 노출, 클릭 시 `/docs` 이동 (quickstart US3-1~US3-2).

### Implementation for User Story 3

- [ ] T010 [US3] 설정 페이지 상단에 API 문서 링크 추가 `src/app/settings/page.tsx` — 페이지 제목 근처 `<Link href="/docs" className="text-sm text-blue-600 hover:underline">API 문서 →</Link>` 1줄 삽입. 새 컴포넌트 추출 금지. [artifact: src/app/settings/page.tsx] [why: settings-link]
- [ ] T011 [US3] quickstart US3-1~US3-2 수동 실행, 스크린샷 `us3-1-settings.png` 수집. quickstart.md 체크박스 업데이트. [artifact: specs/011-project-identity-surface/quickstart.md] [why: visual-evidence]

**Checkpoint**: US3 머지 시점 PR #3(US1에 의존하지 않음, US1 이후 언제든 가능).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 배포·릴리즈 준비. US1·US2·US3가 모두 머지된 뒤 수행.

- [ ] T012 CHANGELOG.md에 v2.4.0 섹션 추가 — 풋터/About/설정 링크 3건을 Added로 기재, 이슈 #200 참조. [artifact: CHANGELOG.md] [why: release-notes]
- [ ] T013 pyproject.toml 버전 2.3.x → 2.4.0 범프. [artifact: pyproject.toml] [why: release-notes]

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 의존 없음. T001 즉시 가능.
- **Phase 2 (Foundational)**: T001 후. T002→T003 순차.
- **Phase 3 (US1)**: Phase 2 완료 후. T004·T005는 동일 참조 관계(T005가 T004 import)이므로 T004 → T005 순차. T006은 T004·T005 이후 수동 검증.
- **Phase 4 (US2)**: Phase 2 완료 후. US1 머지(PR #1)와 무관하게 구현 시작 가능하나, 풋터 About 링크(T008)는 US1의 T004를 수정하므로 PR #1 머지 후에 진행(merge conflict 회피).
- **Phase 5 (US3)**: Phase 2 불요(메타 소스 미참조). T001만 선행. 실질적으로 Phase 2 이후 언제든 시작 가능.
- **Phase 6 (Polish)**: US1·US2·US3 PR이 모두 develop에 머지된 뒤 develop→main 릴리즈 PR 단계에서 수행.

### User Story Dependencies

- **US1**: Phase 2(메타 소스)에만 의존.
- **US2**: Phase 2 + US1(풋터에 About 링크 추가 지점). 구현은 독립 병렬 가능하나 머지 순서는 US1 → US2.
- **US3**: 독립. US1·US2와 무관.

### Parallel Opportunities

- T002와 T001은 다른 파일 → 이론상 병렬이나 T001이 먼저 끝나도 T002 차단 없음. 순차 수행으로도 충분.
- US1의 T004·T005는 T005가 T004 import하므로 순차.
- US2의 T007은 T002(메타 소스)와 contracts 문서만 참조 → Phase 2 직후 US1 완료 전이라도 작성 가능(로컬 테스트는 US1 머지 후).
- US3의 T010은 완전 독립. Phase 2와 병렬도 가능(`projectMeta` 미참조).
- T006·T009·T011의 수동 검증(quickstart 실행)은 각각 해당 US 구현 직후에만.

---

## Parallel Example: User Story들 간 병렬 워크

```bash
# Phase 2 완료 후, 서로 다른 터치포인트를 가진 US들을 병렬 워크트리로 진행 가능:
# - 워크트리 A: US1 (src/components/Footer.tsx, src/app/layout.tsx)
# - 워크트리 B: US3 (src/app/settings/page.tsx)   ← US1과 파일 독립
# US2는 US1의 Footer.tsx를 수정하므로 머지 충돌 회피 위해 US1 이후 진행
```

---

## Implementation Strategy

### MVP First (US1 only — PR #1)

1. Phase 1 T001 완료
2. Phase 2 T002·T003 완료 → 메타 소스 안정
3. Phase 3 T004·T005·T006 완료 → 풋터 렌더 확인
4. **STOP and VALIDATE**: quickstart US1 수동 증거 수집
5. develop PR → dev.trip.idean.me 확인 → 머지

### Incremental Delivery

1. PR #1 (US1) 머지 → dev 확인
2. PR #2 (US2) 생성 → dev 확인 → 머지
3. PR #3 (US3) 생성 → dev 확인 → 머지 (순서 무관)
4. 3개 PR 모두 머지 후 Phase 6 T012·T013 수행 → develop → main 릴리즈 PR (v2.4.0)

### Parallel Team Strategy

본 프로젝트는 1인 개발이므로 실질 병렬은 워크트리 분기로 수행. US1과 US3는 파일 독립이므로 두 워크트리에서 동시 진행 가능.

---

## Notes

- [P] 마커는 다른 파일 + 선행 없음을 뜻한다. 본 피처는 파일 의존 관계가 명확해 [P] 태스크가 많지 않다.
- 모든 태스크에 [artifact]와 [why]가 부착되어 drift·커버리지 검증 대상이다.
- `tsc --noEmit`은 Phase 2·6의 묵시적 검증 단계. 별도 태스크 번호를 부여하지 않고 T003·T013 진행 중 실행한다.
- 커밋은 태스크 묶음(US 단위) 또는 논리 묶음(Phase 2 전체, Phase 6 전체) 단위로 분할한다.
