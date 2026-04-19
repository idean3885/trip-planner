# Quickstart: shadcn/ui Phase 2 — 복합 컴포넌트 + 레거시 유틸리티 제거

**Feature**: `013-shadcn-phase2` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## US1 — 복합 컴포넌트 마이그레이션 후 주요 여행 플로우 시각 일관성

### Scenario US1-1: 여행 목록·상세·Day 상세·활동 편집의 카드 체계 일관성

주 플로우 4개 페이지(홈 `/`, 여행 상세 `/trips/<id>`, Day 상세 `/trips/<id>/day/<dayId>`, 활동 편집 폼)를 모바일(375px)·데스크톱(1280px) 두 뷰포트에서 순회하며 카드 외곽·radius·padding·간격·호버 피드백이 동일 규칙인지 확인한다. 레이아웃 깨짐·폰트 치환·색상 역전 0건.

### Scenario US1-2: 복합 컴포넌트 포커스 순회

`ActivityCard`·`ActivityList`·`DayEditor`에서 Tab·Shift+Tab으로 모든 포커스 가능 요소를 왕복 순회한다. 포커스 링이 항상 시각적으로 식별 가능. 포커스 트랩 없음.

### Evidence

- 수동 체크리스트:
  - [ ] 모바일 375px 스크린샷 4장 (목록·상세·Day·활동 편집) — `docs/evidence/013-shadcn-phase2/us1-mobile-*.png`
  - [ ] 데스크톱 1280px 스크린샷 4장 — `docs/evidence/013-shadcn-phase2/us1-desktop-*.png`
  - [ ] 카드 체계 비교표 1종 (외곽 radius·padding·gap·hover state) — `docs/evidence/013-shadcn-phase2/us1-card-comparison.md`
  - [ ] 포커스 순회 로그 3종 (ActivityCard/ActivityList/DayEditor) — `docs/evidence/013-shadcn-phase2/us1-focus-*.md`
- 자동 테스트: `pnpm test -- tests/components/ActivityList.test.tsx` 기존 테스트 100% 통과 유지 확인
- 스크린샷: `docs/evidence/013-shadcn-phase2/` 디렉토리에 집계

## US2 — 레거시 유틸리티 제거로 신규 UI 작성 시 구조적 일관성

### Scenario US2-1: `scripts/check-legacy-utilities.sh` 0건

리포 루트에서 스크립트를 실행하여 `rounded-card`/`shadow-card`/`bg-primary-[0-9]`/`text-surface-*` 등 제거 대상이 `src/**`·`styles/**`에서 0건임을 확인한다. 의도된 예외 경로(`changes/`, 이전 스펙 디렉토리, 감사 보고서, 본 스펙 디렉토리)는 exclude 반영.

### Scenario US2-2: 토큰 정본 ↔ 빌드 산출물 diff 0

`pnpm run tokens:build` 실행 후 `git diff src/app/globals.css` 가 0 라인이어야 한다(수동 편집 흔적 없음). 이미 정본 변경이 반영된 상태라면 커밋 체인에서 결정적 일치 확인.

### Scenario US2-3: 토큰 사용처 ↔ 정본 일치

`pnpm run audit:tokens` 실행 결과 고아 토큰(0회 사용) 및 그림자 토큰(사용되나 정본에 없음) 각 0건.

### Evidence

- 자동 테스트:
  - `bash scripts/check-legacy-utilities.sh` — 리포 루트 실행, exit 0 기대
  - `pnpm run audit:tokens` — exit 0 + 요약 표 stdout
  - `pnpm run tokens:build && git diff --exit-code src/app/globals.css`
- 수동 체크리스트:
  - [ ] 의도된 예외 경로가 스크립트 exclude 반영 확인
  - [ ] CI 워크플로에 `check-legacy-utilities.sh` step 존재 확인 — `docs/evidence/013-shadcn-phase2/us2-ci-step.png` 또는 commit 링크

## US3 — 디자인 토큰 정본 3계층 정합성

### Scenario US3-1: 토큰 수정 → 빌드 → 사용처 반영의 단일 커밋 시나리오

`design/tokens.json`에서 임의 토큰(예: `--radius`) 값을 변경 → `pnpm run tokens:build` → `globals.css` 갱신 → 영향 받는 컴포넌트에서 시각 변화 확인 → 단일 커밋으로 묶을 수 있는지 검증한다. 수동 편집 단계 0.

### Scenario US3-2: 활성 토큰 목록 인벤토리

본 스펙 `data-model.md`의 "유지" / "제거 대상" 표와 Phase 2 머지 후 `design/tokens.json` · `globals.css` `@theme` 블록을 비교하여 인벤토리가 일치하는지 확인.

### Evidence

- 자동 테스트: `pnpm run audit:tokens` — 토큰 인벤토리 표 stdout을 `docs/evidence/013-shadcn-phase2/us3-tokens-audit.log`에 보관
- 수동 체크리스트:
  - [ ] 임의 토큰 수정 → 빌드 → 반영 시나리오 단일 커밋 재현 완료
  - [ ] data-model.md 인벤토리와 최종 산출물 일치 비교표 — `docs/evidence/013-shadcn-phase2/us3-inventory-diff.md`

## 공용 Evidence — 파이프라인 회귀 없음 (FR-005·SC-004)

### Evidence

- 자동 테스트:
  - `pnpm tsc --noEmit`
  - `pnpm build`
  - `pnpm test`
  - `pnpm lint`
  - `.github/workflows/ci.yml` 녹색 판정 (PR 단위)
- 수동 체크리스트:
  - [ ] 각 PR에서 상기 4개 커맨드 로컬 통과 기록 PR description 첨부
  - [ ] develop 머지 후 dev.trip.idean.me 배포 정상 확인

## 공용 Evidence — #300 Decimal 전제 조건 (Assumptions)

### Evidence

- 수동 체크리스트:
  - [ ] develop에 #300 (Decimal 직렬화) 머지 상태 확인 — 본 피처 첫 PR 생성 시점에 main·develop 모두 반영되어야 함
  - [ ] 미반영 시 Day 상세 슬라이스(US1 일부) 보류 결정 공유 — Phase 2 계획 bullet 갱신
