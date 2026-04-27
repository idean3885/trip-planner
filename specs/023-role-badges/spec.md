# Feature Specification: 동행자 목록 주인+호스트 복수 뱃지

**Feature Branch**: `023-role-badges`
**Created**: 2026-04-23
**Status**: Released (v2.10.0 — 2026-04-23)
**Input**: User description: "주인은 호스트의 상위집합이라는 역할 포함 관계(docs/glossary.md)를 UI에 표면화. 동행자 목록에서 role === OWNER이면 '주인' + '호스트' 뱃지를 나란히 표시."

## Background

[`docs/glossary.md`](../../docs/glossary.md)는 "주인 ⊃ 호스트 ⊃ 게스트" 포함 관계를 명시한다. 데이터 모델(`TripRole` enum)은 상호 배타지만, 의미 계층상 주인은 호스트가 가진 편집 권한을 전부 가진다. 현재 동행자 목록은 단일 뱃지만 보여 이 계층이 UI에서 드러나지 않는다.

## Clarifications

1. **용어** — `docs/glossary.md` 정본(주인/호스트/게스트) 그대로 사용.
2. **범위** — UI 렌더링만. 데이터 모델·권한 매트릭스·API 동작 변경 없음.
3. **표시 규칙** — `OWNER`: **주인 + 호스트 두 뱃지** (주인이 시각적으로 강조, 호스트는 보조). `HOST`: 호스트 단일. `GUEST`: 게스트 단일.

## Metatag Conventions *(normative)*

- `[artifact: <path>|<path>::<symbol>]`
- `[why: <short-tag>]`
- `[multi-step: N]` (N ≥ 2일 때)

## User Scenarios & Testing

### User Story 1 — 주인의 복수 뱃지 (Priority: P1)

동행자 목록에서 주인 계정은 "주인" + "호스트" 두 뱃지가 **주인 먼저**로 나란히 노출된다.

**Independent Test**: 주인 1명 + 호스트 1명 + 게스트 1명 여행을 렌더 → 주인 줄에 뱃지 2개, 호스트 줄에 뱃지 1개, 게스트 줄에 뱃지 1개.

**Acceptance Scenarios**:

1. **Given** `role === OWNER` 멤버, **When** 렌더, **Then** 주인 뱃지(강조) + 호스트 뱃지(보조) 순으로 노출.
2. **Given** `role === HOST` 멤버, **When** 렌더, **Then** 호스트 뱃지 단일만 노출.
3. **Given** `role === GUEST` 멤버, **When** 렌더, **Then** 게스트 뱃지 단일만 노출.

### Edge Cases

- 모바일 작은 화면에서 뱃지 wrap 허용.
- 기존 `MemberList` 정렬(OWNER → HOST → GUEST)은 유지.

## Requirements

### Functional Requirements

- **FR-001**: 시스템은 동행자 목록에서 `role === 'OWNER'` 멤버에게 **"주인" + "호스트"** 두 뱃지를 노출한다.
- **FR-002**: 시스템은 `role === 'HOST'` 멤버에게 **"호스트"** 단일 뱃지만 노출한다.
- **FR-003**: 시스템은 `role === 'GUEST'` 멤버에게 **"게스트"** 단일 뱃지만 노출한다.
- **FR-004**: 주인의 두 뱃지는 **주인 먼저** 시각·DOM 순서.
- **FR-005**: 본 피처는 `TripRole` enum·권한 매트릭스·API 응답 스키마를 **변경하지 않는다**.
- **FR-006**: 기존 `MemberList` 정렬(OWNER → HOST → GUEST)은 유지.

### Key Entities

- **TripMember.role** (`TripRole` enum): UI 렌더 분기에만 사용. 스키마 변경 없음.

## Success Criteria

- **SC-001**: 주인 계정의 동행자 목록 항목에서 뱃지 2개가 렌더된다(자동 테스트).
- **SC-002**: 호스트·게스트는 뱃지 1개가 렌더된다.
- **SC-003**: 기존 스냅샷·렌더 테스트 회귀 0.

## Assumptions

- `TripMember.role`이 여전히 단일값 enum이며 본 피처에서 이 가정을 유지.
- 뱃지 스타일은 기존 `MemberList.tsx::roleBadge` 패턴 재사용.

## Non-Goals

- 데이터 모델 변경, 권한 매트릭스 재정의, 승격/강등 플로우 수정.
