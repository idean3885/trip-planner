# Feature Specification: Git 브랜치/릴리즈 전략 수립

**Feature Branch**: `009-git-release-strategy`  
**Created**: 2026-04-16  
**Status**: Draft  
**Input**: GitHub 이슈 #148

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 릴리즈 자동화 (Priority: P1)

개발자가 버전을 올리고 main에 머지하면, annotated 태그 생성 → Release 생성 → 패키지 배포까지 자동으로 완료된다.

**Why this priority**: 현재 태그 자동 생성은 있으나 경량 태그이고, Release는 수동 생성. 릴리즈 프로세스 표준화가 가장 큰 개선점.

**Independent Test**: 버전 변경 PR 머지 후 Release가 자동 생성되는지 확인.

**Acceptance Scenarios**:

1. **Given** 새 버전이 설정된 커밋이 main에 머지되면, **When** CI가 실행되면, **Then** annotated 태그가 생성되고 CHANGELOG 기반 Release가 자동 생성된다.
2. **Given** 이미 존재하는 버전 태그가 있으면, **When** 동일 버전으로 push하면, **Then** 태그 생성을 건너뛴다.

---

### User Story 2 - 릴리즈 프로세스 문서화 (Priority: P2)

릴리즈 절차가 문서화되어 매번 동일한 순서로 진행된다.

**Why this priority**: 프로세스가 머릿속에만 있으면 누락이 발생한다.

**Independent Test**: 문서에 기술된 절차대로 따라하면 릴리즈가 완료되는지 확인.

**Acceptance Scenarios**:

1. **Given** 릴리즈 절차가 문서화되면, **When** 개발자가 절차를 따르면, **Then** CHANGELOG → 버전 범프 → PR → 머지 → 자동 태그 → 자동 릴리즈 순서로 완료된다.

---

### Edge Cases

- CHANGELOG에 해당 버전 섹션이 없으면? → Release 노트에 커밋 로그 요약 표시.
- 태그 생성 실패 시? → CI 실패 알림, 수동 대응.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: CI는 main 브랜치에 버전 변경이 감지되면 annotated 태그를 자동 생성해야 한다.
- **FR-002**: CI는 태그 생성 시 CHANGELOG에서 해당 버전 섹션을 추출하여 Release를 자동 생성해야 한다.
- **FR-003**: 릴리즈 프로세스가 문서화되어야 한다.
- **FR-004**: 기존 경량 태그를 annotated 태그로 전환해야 한다 (최근 릴리즈 대상).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 버전 변경 후 main 머지 시 5분 이내에 Release가 자동 생성된다.
- **SC-002**: 릴리즈 프로세스에 수동 단계가 3개 이하이다 (CHANGELOG 작성 + 버전 범프 + PR).

## Assumptions

- CI 플랫폼 사용 가능 (현재 이미 사용 중).
- 기존 자동 태그 워크플로우의 시크릿이 설정되어 있다.
