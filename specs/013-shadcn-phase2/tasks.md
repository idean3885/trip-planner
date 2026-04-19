---
description: "Tasks: shadcn/ui Phase 2 — 복합 컴포넌트 + 레거시 유틸리티 제거"
---

# Tasks: shadcn/ui Phase 2 — 복합 컴포넌트 + 레거시 유틸리티 제거

**Input**: Design documents from `/specs/013-shadcn-phase2/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 본 피처는 UI 시각 회귀 + 기존 단위 테스트 유지가 기준. 신규 단위 테스트 작성은 요구하지 않는다(스펙에 명시 없음). 기존 `tests/components/ActivityList.test.tsx` 등은 100% 통과 유지.

**Organization**: 태스크는 User Story별 Phase로 묶인다. 각 스토리는 독립 테스트 가능(quickstart Evidence 기준).

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

- **[P]**: 서로 다른 파일 + 선행 의존 없음. 병렬 실행 가능.
- **[Story]**: US1 / US2 / US3 — spec.md의 User Story.
- **[artifact]**: 산출 파일 경로(또는 `path::symbol`) — drift 감사 기준(필수).
- **[why]**: plan Coverage Target과 일치하는 그룹 태그(필수).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 브랜치 상태·의존성·선행 머지 확인. Phase 2/3 진입 전 차단 체크.

- [ ] T001 피처 브랜치 `013-shadcn-phase2`에서 `git pull --rebase origin develop` 실행하여 최신 develop(v2.4.4 머지 반영) 기준 확인 [artifact: .git/refs/heads/013-shadcn-phase2] [why: complex-migrate]
- [ ] T002 `pnpm install --frozen-lockfile` 실행 후 `pnpm tsc --noEmit`·`pnpm lint`·`pnpm test`가 모두 통과함을 확인(기준선) [artifact: package-lock.json] [why: complex-migrate]

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: US1에 들어가기 전 선행 조건 확인. Day 상세 슬라이스의 회귀 판정 정확성을 보장.

**⚠️ CRITICAL**: 아래 확인 전에는 US1의 Day 상세 슬라이스(T010~T011)를 시작하지 않는다.

- [ ] T003 `#300` Decimal 직렬화 해결이 develop에 머지되어 있는지 확인. 미반영이면 해당 hotfix PR 추적 후 Day 상세 슬라이스 보류 결정을 quickstart 공용 Evidence에 기록 [artifact: src/app/trips::day-decimal-mapping] [why: day-detail-migrate]
- [ ] T004 `specs/013-shadcn-phase2/contracts/component-api.md` 내 "카탈로그 샘플 데이터" 상수 파일을 실제 모듈로 분리(카탈로그 확장 T012의 선행) [artifact: src/app/_dev/components/_samples.ts] [why: catalog-expand]

**Checkpoint**: Foundation 확인 완료 — US1 구현 시작 가능.

---

## Phase 3: User Story 1 — 복합 컴포넌트 + 주요 페이지 시각 일관성 (Priority: P1) 🎯 MVP

**Goal**: 주 여행 플로우(목록·상세·Day 상세·활동 편집)가 shadcn `<Card>` 기반 단일 시각 체계 위에서 렌더. 레이아웃 깨짐·폰트 치환·색상 역전 0건.

**Independent Test**: 다른 스토리 미완료 상태에서도 375px·1280px 두 뷰포트에서 4개 페이지 순회 시 카드 외곽·간격·hover가 동일 규칙을 따르고, 빌드·타입체크·테스트·CI가 전환 전과 동일 통과. quickstart US1 Evidence로 확인.

### Implementation for User Story 1

- [ ] T005 [P] [US1] `ActivityCard` 외곽을 shadcn `<Card>` + `<CardHeader>`/`<CardContent>`/`<CardFooter>`로 재구성. 로직·props·핸들러 보존(contracts/component-api.md §1) [artifact: src/components/ActivityCard.tsx] [why: complex-migrate]
- [ ] T006 [P] [US1] `ActivityList` 리스트 컨테이너를 shadcn `<Card size="sm">` 반복 구조로 재구성. 빈 상태 표시·드래그 핸들러·정렬 로직 보존(contracts/component-api.md §2) [artifact: src/components/ActivityList.tsx] [why: complex-migrate]
- [ ] T007 [P] [US1] `DayEditor` 외곽 카드와 폼 필드를 shadcn `<Card>` + `<Field>` + `<Label>`로 전환. 저장/취소 핸들러·검증 로직 보존(contracts/component-api.md §3) [artifact: src/components/DayEditor.tsx] [why: complex-migrate]
- [ ] T008 [P] [US1] 홈 여행 목록 페이지를 shadcn `<Card>` 기반으로 정식 전환. POC 결과(`spike/shadcn-trip-detail`)는 참고만, 최신 develop 기준 재작성 [artifact: src/app/page.tsx] [why: page-migrate]
- [ ] T009 [P] [US1] 여행 상세 페이지(`src/app/trips/[id]/page.tsx`)의 "여행 개요"·"일정" 섹션 + 링크형 카드를 shadcn `<Card>`로 전환 [artifact: src/app/trips::TripDetailPage] [why: page-migrate]
- [ ] T010 [P] [US1] `MemberList` 외곽과 역할 뱃지를 shadcn `<Card>` + semantic 토큰 기반으로 전환 [artifact: src/components/MemberList.tsx] [why: page-migrate]
- [ ] T011 [US1] Day 상세 페이지(`src/app/trips/[id]/day/[dayId]/page.tsx`) 상단(DAY 제목·날짜 영역) + 본문(활동 리스트 외곽)을 shadcn `<Card>`로 재구성. #285 DAY 넘버링 로직 수용 확인 [artifact: src/app/trips::DayDetailPage] [why: day-detail-migrate]
- [ ] T012 [US1] Day 상세 페이지(`src/app/trips/[id]/day/[dayId]/page.tsx`)의 `day.content` 섹션(prose 렌더) 외곽을 shadcn `<Card>`로 전환하고 prose 스타일 충돌 검증 [artifact: src/app/trips::DayContentSection] [why: day-detail-migrate]
- [ ] T013 [P] [US1] 미리보기 카탈로그 `/_dev/components`에 `ActivityCard`·`ActivityList`·`DayEditor`·`MemberList` 샘플 섹션 추가(T004의 샘플 상수 활용) [artifact: src/app/_dev/components/page.tsx] [why: catalog-expand]

**Checkpoint**: US1 완료 시점에 주 여행 플로우 4개가 shadcn 일관 체계 위에 놓임. quickstart US1 Evidence 수집 가능.

---

## Phase 4: User Story 2 — 레거시 유틸리티 전면 제거 (Priority: P2)

**Goal**: 레거시 커스텀 유틸리티(`rounded-card`/`shadow-card`/`bg-primary-*`/`text-surface-*`/`text-heading-*`/`text-body-*`)가 `src/**`·`styles/**`에서 0건. 재유입 구조적 차단(정본 제거 + CI 게이트).

**Independent Test**: `bash scripts/check-legacy-utilities.sh` 및 `pnpm run audit:tokens`가 모두 exit 0. CI 파이프라인에 해당 step이 등록되어 PR 단계에서 회귀 차단 확인.

### Implementation for User Story 2

- [ ] T014 [P] [US2] `scripts/check-legacy-utilities.sh` 신규 작성(contracts/legacy-removal.md "검증 스크립트 계약" 참조). ripgrep 기반, exclude 경로 반영, exit 2 on violation [artifact: scripts/check-legacy-utilities.sh] [why: legacy-cleanup]
- [ ] T015 [P] [US2] `scripts/audit-tokens.ts` 작성 — `design/tokens.json` ↔ `globals.css` `@theme` ↔ `src/**` 사용처의 3계층 diff 리포트 [artifact: scripts/audit-tokens.ts] [why: legacy-cleanup]
- [ ] T016 [US2] US1 작업 완료 시점에 남은 레거시 유틸리티 사용처를 스크립트 리포트로 집계한 후 일괄 치환(contracts/legacy-removal.md "Tailwind 유틸리티 클래스" 표 기준). 결과: `check-legacy-utilities.sh` 0건 [artifact: src/**/*.tsx|src/**/*.ts] [why: legacy-cleanup]
- [ ] T017 [US2] `design/tokens.json`에서 제거 대상(color.primary.{50..900}·color.surface.*·color.sky.*·shadow.card*·radius.card·maxWidth.content) 삭제 [artifact: design/tokens.json] [why: legacy-cleanup]
- [ ] T018 [US2] `pnpm run tokens:build` 재실행하여 `globals.css` `@theme` 블록 갱신을 결정적 diff로 확인 [artifact: src/app/globals.css] [why: legacy-cleanup]
- [ ] T019 [US2] `.github/workflows/ci.yml`에 `bash scripts/check-legacy-utilities.sh`·`pnpm run audit:tokens` step 추가(v2.4.4 #286 패턴 준수) [artifact: .github/workflows/ci.yml] [why: legacy-cleanup]
- [ ] T020 [US2] `package.json`에 `audit:tokens` npm script 추가 [artifact: package.json::scripts.audit:tokens] [why: legacy-cleanup]

**Checkpoint**: US2 완료 시점에 레거시 유틸리티가 구조적으로 제거되고 CI 게이트가 재유입을 차단.

---

## Phase 5: User Story 3 — 디자인 토큰 3계층 정합성 확보 (Priority: P3)

**Goal**: `design/tokens.json` ↔ `globals.css` `@theme` ↔ 사용처의 3계층이 결정적 일방향. 고아·그림자 토큰 0건.

**Independent Test**: 임의 토큰(예: `--radius`) 수정 → 빌드 → 사용처 반영이 단일 커밋으로 재현됨. `pnpm run audit:tokens` 고아/그림자 각 0건.

### Implementation for User Story 3

- [ ] T021 [US3] `pnpm run audit:tokens` 실행 결과의 잔여 고아 토큰을 `design/tokens.json`에서 제거하거나 `allowlist`에 미래 예약으로 명시 [artifact: design/tokens.json] [why: legacy-cleanup]
- [ ] T022 [US3] 그림자 토큰(사용처에만 존재) 발견 시 해당 사용처를 semantic 토큰으로 치환하거나 정본에 추가 [artifact: src/**/*.tsx|src/**/*.ts] [why: legacy-cleanup]
- [ ] T023 [US3] `scripts/audit-tokens.ts`에 allowlist(예: 미래 예약 토큰) 파서를 추가하고 문서화 [artifact: scripts/audit-tokens.ts::allowlist] [why: legacy-cleanup]

**Checkpoint**: US3 완료 시점에 토큰 정본 ↔ 빌드 ↔ 사용처가 양방향 diff 0. 디자이너 합류 시 `tokens.json`만 편집하면 반영이 결정적.

---

## Phase 6: Polish & Evidence

**Purpose**: quickstart Evidence 수집, 릴리즈 단편, 최종 통합 확인.

- [ ] T024 [P] US1 Evidence 수집 — 375px·1280px 스크린샷 8장 + 카드 비교표 1종 + 포커스 순회 로그 3종 [artifact: docs/evidence/013-shadcn-phase2/us1-*] [why: visual-evidence]
- [ ] T025 [P] US2 Evidence 수집 — `check-legacy-utilities.sh` 실행 로그 + `audit-tokens` 성공 출력 + CI step 증거 [artifact: docs/evidence/013-shadcn-phase2/us2-*] [why: visual-evidence]
- [ ] T026 [P] US3 Evidence 수집 — 토큰 인벤토리 diff 리포트 + 단일 커밋 재현 로그 [artifact: docs/evidence/013-shadcn-phase2/us3-*] [why: visual-evidence]
- [ ] T027 Towncrier 단편 작성 (타입 `feat`, 이슈 #301) [artifact: changes/301.feat.md]
- [ ] T028 최종 Constitution Check 재검증(V·VI 도메인·권한 변경 0건 확인) + PR description 템플릿에 리뷰 게이트(contracts/component-api.md "리뷰 게이트") 삽입 [artifact: specs/013-shadcn-phase2/plan.md::ConstitutionCheck]
- [ ] T029 피처 완료 후 `spike/shadcn-trip-detail` 워크트리·브랜치 정리(참고용 draft PR 닫기 + 브랜치 삭제) [artifact: .git/refs/heads/spike/shadcn-trip-detail]

---

## Dependencies

### Cross-Phase

- **Phase 1 → Phase 2**: Setup 통과 후 Foundational 진입
- **Phase 2 → Phase 3**: #300 확인·샘플 파일 분리 후 US1 시작
- **Phase 3 → Phase 4**: US1에서 복합 컴포넌트·페이지 전환 완료 후 레거시 유틸리티 잔여분 최종 집계 가능 (T016은 US1 완료 의존)
- **Phase 4 → Phase 5**: `audit-tokens.ts`(T015) 도입 후 US3 검증 시나리오 실행 가능
- **Phase 5 → Phase 6**: US1~US3 완료 후 Evidence·릴리즈 단편 작성

### Intra-Phase (US1)

- T005·T006·T007·T008·T009·T010·T013 병렬 가능 (`[P]` 표기)
- T011·T012 순차 (같은 파일 — Day 상세 page.tsx)

### Intra-Phase (US2)

- T014·T015 병렬 가능
- T016 → T017 → T018 순차 (치환 → 정본 삭제 → 빌드 재생성)
- T019·T020 병렬 가능

---

## Parallel Execution Examples

### US1 병렬 실행 그룹 (T005·T006·T007·T008·T009·T010·T013)

```
독립 파일: ActivityCard / ActivityList / DayEditor / 홈 page / 여행 상세 page / MemberList / 카탈로그
로직 변경 0, 스타일만 재작성이므로 서로 간섭 없음
Day 상세(T011·T012)는 동일 파일이므로 이 그룹에서 제외
```

### US2 병렬 실행 그룹 (T014·T015)

```
scripts/check-legacy-utilities.sh + scripts/audit-tokens.ts 동시 작성
```

### Polish 병렬 실행 그룹 (T024·T025·T026)

```
서로 다른 Evidence 디렉토리 집적
```

---

## Implementation Strategy

### MVP 스코프

US1 단독 완료 시점에 이미 "Phase 2의 가치"가 사용자에게 도달한다. 주 플로우 4개가 shadcn 체계 위에서 일관된 감성으로 보임. 레거시 유틸리티(US2)·토큰 정합(US3)은 "구조적 보장"이라 사용자 체감보다 개발자·AI 에이전트 일관성에 기여 — 머지 순서를 늦춰도 사용자 가치 손실 없음.

### Incremental Delivery

- **PR1 (US1 1/3)**: T005·T006·T007 (복합 컴포넌트 3종) → develop 머지 → dev 환경 확인
- **PR2 (US1 2/3)**: T008·T009·T010 (주요 페이지 + MemberList) → develop 머지
- **PR3 (US1 3/3)**: T011·T012·T013 (Day 상세 + 카탈로그) → develop 머지
- **PR4 (US2)**: T014~T020 (스크립트 + 치환 + CI 게이트) → develop 머지
- **PR5 (US3 + Polish)**: T021~T029 (토큰 정합 + Evidence + 단편) → develop 머지
- **Release**: v2.5.0 towncrier build + develop → main PR

각 PR은 앞선 PR에 의존하지만, 앞선 PR이 독립 동작 가능하도록 분할. PR1 단독 머지 상태에서도 사용자 체감 일관성은 유지(스타일만 변경, 로직 보존).

### 리스크 대응

- **#300 미반영**: T003에서 확인. 미반영이면 T011·T012를 보류하고 US1 MVP를 T005~T010·T013으로 축소. T011·T012는 #300 반영 후 재개.
- **Rebase 충돌**: T001에서 매 PR 시작 전 rebase 수행. 로직 영역 diff 0건 원칙(R-4)으로 자동 해소.
- **레거시 유틸리티 누락**: T016의 최종 grep 결과가 유일한 신뢰 가능 기준. 수동 검색 대신 스크립트 산출물로 확정.
