# Tasks: 글래스모피즘 확장 — 여행 상세 콘텐츠 + 카드 테두리 선명화

**Feature**: `066-glass-content-surfaces` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

## Phase 1: Setup

- [x] T001 대상 표면 확인 (`src/components/ActivityCard.tsx`, `src/components/trip/TripDetailLayout.tsx` 모바일 주간 달력 래퍼, `src/components/ui/card.tsx` 테두리)

## Phase 2: US1 — 여행 상세 콘텐츠 유리 표면 (P1)

**목표**: 활동 카드·주간 달력 래퍼 글래스. **독립 테스트**: ActivityCard glass 렌더 + 래퍼 glass-surface 클래스.

- [x] T002 [US1] `ActivityCard`의 `Card`에 `glass` 적용(기존 spec 065 glass prop 재사용) [artifact: src/components/ActivityCard.tsx] [why: glass-content]
- [x] T003 [US1] 여행 상세 모바일 주간 달력 래퍼의 `bg-card`를 `.glass-surface`로 교체(달력 셀 텍스트·상태는 유지) [artifact: src/components/trip/TripDetailLayout.tsx] [why: glass-content]

## Phase 3: US2 — 카드 테두리 네 변 선명화 (P2)

**목표**: 카드 테두리 대비 상향. **독립 테스트**: card.tsx ring 대비가 이전보다 높은 값.

- [x] T004 [US2] `card.tsx`의 카드 테두리 `ring-foreground/10` → `ring-foreground/15`로 대비 상향(네 변 공통) [artifact: src/components/ui/card.tsx] [why: border-crisp]

## Phase 4: Polish

- [x] T005 [P] 글래스 확장·테두리 회귀 테스트 — ActivityCard glass 렌더, 주간 달력 래퍼 glass-surface, card.tsx 테두리 대비 상향 검증 [artifact: tests/components/glass-content.test.tsx] [why: glass-content]
- [x] T006 색상 가드 확인 — 신규 하드코딩 색 0건, 기존 :root 토큰 재사용 (lint/color-guard)
- [x] T007 quickstart Evidence 자동 테스트 통과 확인 (`npx vitest run`)
- [ ] T008 towncrier 단편 작성 (release 단계 소비, 미체크 유지) [artifact: changes/928.feat.md] [why: glass-content]

## Dependencies

- Setup(T001) → US1(T002·T003)·US2(T004) → Polish.

## Parallel Opportunities

- T002·T003·T004는 서로 다른 파일 — 병렬 가능. T005 테스트는 구현 후.

## MVP Scope

US1(콘텐츠 글래스)만으로 여행 상세에서 글래스가 체감되는 최소 배포 단위.
