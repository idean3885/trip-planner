# Feature Specification: Day.sortOrder 컬럼 DROP (v2.7.1 contract)

**Feature Branch**: `016-sortorder-drop`
**Created**: 2026-04-20
**Status**: Released (v2.7.1 — 2026-04-20)
**Input**: v2.7.1 contract — Day.sortOrder 컬럼 DROP (#317)

## Clarifications

1. **expand-and-contract 패턴의 contract 단계** — v2.7.0(#296)에서 추가한 dayNumber 파생 응답 + v2 신설 후, 더 이상 의미 없는 `Day.sortOrder` 컬럼을 제거.
2. **v1 호환 100% 유지** — `/api/trips/...` 응답에서 `sortOrder` 키는 그대로 정수로 응답되며, 값은 컬럼 대신 `(date - trip.startDate) + 1` 동적 계산으로 생성. MCP 클라이언트 영향 0.
3. **7일 관찰 기간 폐기** — 본 프로젝트 규모(1인, 데이터 ~15건, 원자 배포)에 안 맞아 즉시 진행. 어댑터 함수가 v2에서 검증되었고 컬럼 DROP은 reversible.

## Metatag Conventions

본 피처의 tasks.md·plan.md는 네 종 메타태그 규약을 따른다.

## User Scenarios & Testing

### User Story 1 - MCP 무중단 (P1)

기존 MCP 클라이언트는 v2.7.1 배포 전후 어떠한 변경 없이 `[Day 1]`, `[Day 2]` ... 정상 표시.

**Independent Test**: MCP `get_trip(1)` 호출 → `days[].sortOrder`가 정수로 응답.

**Acceptance**:
1. **Given** v2.7.1 배포, **When** MCP `get_trip(1)`, **Then** `[Day 1]`...`[Day N]` 정상

### User Story 2 - DB 정리 (P2)

`Day.sortOrder` 컬럼이 DB에서 제거된다. 응답에서는 그대로 정수.

**Acceptance**:
1. **Given** 마이그레이션 적용 후, **When** 컬럼 점검, **Then** `sort_order` 컬럼 부재
2. **Given** 동일 환경, **When** `/api/trips/1` 응답 검사, **Then** `days[].sortOrder` 키 정수 존재

## Functional Requirements

- **FR-001**: `Day.sortOrder` 컬럼을 스키마에서 제거 + DROP COLUMN 마이그레이션
- **FR-002**: v1 GET 응답에 `sortOrder` 키를 동적 계산 값으로 포함
- **FR-003**: v1 POST/PUT은 더 이상 `sortOrder` 컬럼에 쓰지 않음
- **FR-004**: `recomputeAllDayNumbers` 함수는 더 이상 sortOrder 컬럼 갱신 책임 없음 → 함수 제거 또는 NOOP

## Success Criteria

- **SC-001**: v2.7.1 배포 직후 MCP `get_trip` 호출 100% 정상
- **SC-002**: DB의 `days.sort_order` 컬럼 완전 제거
- **SC-003**: 모든 v1 테스트 그대로 통과 (응답 스키마 변경 없음)

## Key Entities

- **Day**: `sortOrder` 컬럼 제거. 응답 시 어댑터가 동적 계산
- **Trip**: 변화 없음

## Out of Scope

- v2 응답 (이미 dayNumber 사용)
- Trip 모델 변경
- DB 인프라 분리(#318)
