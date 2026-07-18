# Feature Specification: 헤더 계정 메뉴 통합

**Feature Branch**: `069-account-menu`
**Created**: 2026-07-19
**Status**: Draft
**Input**: 디자이너 전문가 리뷰 — 헤더의 이메일·설정·로그아웃 flat 나열을 단일 계정 메뉴로 접기.

## Clarifications
1. 세 항목(이메일·설정·로그아웃) 모두 유지하되 단일 계정 메뉴(아이콘/이니셜 트리거 → 드롭다운) 안으로 접는다.
2. 현재 `AuthButton`의 `hidden sm:inline-block` 뷰포트 분기(#641 봉합용)는 "웹/모바일 단일 반응형(뷰포트 분기 금지)" 원칙 위반 — 계정 메뉴로 접으며 제거한다.
3. 트립 상세의 ☰(TripActionsMenu)와는 병합하지 않는다(전역 계정 vs 페이지 컨텍스트 액션 스코프 분리). 드롭다운 컴포넌트(shadcn DropdownMenu)만 재사용.
4. 메뉴 항목 순서: 이메일(읽기전용 라벨, 상단) → 설정 → 구분선 → 로그아웃(하단).

## Metatag Conventions *(normative)*
`[artifact]` · `[why]` · `[multi-step]` · `[migration-type]`(해당 없음).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 헤더에서 계정 메뉴 하나로 계정 액션 접근 (Priority: P1)
로그인 사용자는 헤더 우측의 계정 트리거(원형 버튼)를 눌러 이메일 확인·설정 이동·로그아웃을 한 메뉴에서 한다.

**Independent Test**: `AuthButton`이 flat 텍스트 링크(+뷰포트 분기) 대신 DropdownMenu 트리거+콘텐츠(이메일 라벨·설정·로그아웃)로 렌더되는지.

**Acceptance Scenarios**:
1. **Given** 로그인 사용자, **When** 헤더가 렌더되면, **Then** 계정 트리거 버튼 하나만 보이고 이메일·설정·로그아웃이 펼쳐져 있지 않다.
2. **Given** 계정 트리거, **When** 열면, **Then** 이메일(라벨)·설정·로그아웃이 메뉴에 나온다.
3. **Given** 임의 뷰포트 폭, **When** 헤더가 렌더되면, **Then** 뷰포트 분기(`hidden sm:*`) 없이 동일 트리거가 보인다.

### Edge Cases
- 이메일/이름이 없을 때 트리거 이니셜 폴백.
- 로그아웃은 메뉴 안 한 단계라 오조작 완충.

## Requirements *(mandatory)*
- **FR-001**: `AuthButton`은 단일 계정 메뉴(트리거 + 드롭다운)로 렌더되어야 한다.
- **FR-002**: 메뉴는 이메일(읽기전용)·설정(→/settings)·로그아웃을 포함해야 한다.
- **FR-003**: 뷰포트 분기(`hidden sm:inline-block` 등)를 제거해야 한다.
- **FR-004**: 트립 ☰(TripActionsMenu)와 병합하지 않는다.
- **FR-005**: 드롭다운은 포털 기반(z-index 안전)이어야 한다.

## Success Criteria *(mandatory)*
- **SC-001**: 헤더에 계정 트리거 1개만 노출(flat 링크 0).
- **SC-002**: 메뉴에 이메일·설정·로그아웃 존재.
- **SC-003**: AuthButton에서 뷰포트 분기 클래스 0.
