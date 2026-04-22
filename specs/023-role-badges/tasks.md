---
description: "023 복수 뱃지 — 태스크"
---

# Tasks: 동행자 목록 주인+호스트 복수 뱃지

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [quickstart.md](./quickstart.md)

## Format

`[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

## Phase 1: Setup

- (해당 없음)

## Phase 2: Foundational

- (해당 없음)

## Phase 3: User Story 1 — 복수 뱃지 렌더 (Priority: P1) 🎯 MVP

- [X] T001 [US1] `src/components/MemberList.tsx`의 `roleBadge`/`roleLabel` 함수를 `rolesFor(role): Array<{ key: "OWNER"|"HOST"|"GUEST"; label: string; tone: "primary"|"secondary"|"muted" }>` 로 교체. `OWNER`→주인+호스트 2개, `HOST`→호스트 1개, `GUEST`→게스트 1개 반환. 렌더 JSX는 `rolesFor(m.role).map(...)` 순회 + `flex flex-wrap gap-1.5` 컨테이너 [artifact: src/components/MemberList.tsx] [why: badge-list]

## Phase 4: Polish

- [X] T002 [P] 단위 테스트 `tests/components/MemberList.test.tsx` — 역할별 뱃지 수·순서 검증(OWNER 2 주인먼저, HOST 1, GUEST 1). Prisma mock 또는 props 기반 분리 버전 사용 [artifact: tests/components/MemberList.test.tsx] [why: test-coverage]
- [X] T003 changes 단편 [artifact: changes/403.feat.md] [why: badge-list]

## Dependencies

- T001 → T002 (테스트는 구현 후)
- T003 독립

## Coverage Validation

| `[why]` | Tasks | 충족 |
|---|---|:-:|
| `badge-list` | T001, T003 | ✓ |
| `test-coverage` | T002 | ✓ |
