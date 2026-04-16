# Feature Specification: 설치 스크립트에 che-ical-mcp 번들 추가

**Feature Branch**: `002-bundle-ical-mcp`  
**Created**: 2026-04-06  
**Status**: Draft  
**Input**: User description: "trip-planner MCP 설치 시 che-ical-mcp도 함께 설치되도록 설치 스크립트 수정. 두 MCP 서버를 한 세트로 묶어 설치."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 원클릭 설치로 travel + calendar MCP 모두 사용 가능 (Priority: P1)

사용자가 `curl ... | bash` 한 줄로 trip-planner를 설치하면, travel MCP 서버와 che-ical-mcp 서버가 모두 Claude Desktop에 등록되어 여행 일정 관리와 캘린더 연동을 바로 사용할 수 있다.

**Why this priority**: 설치가 되어야 모든 기능을 사용할 수 있다. 두 서버를 별도로 설치하면 비개발자 사용자는 캘린더 연동을 놓치게 된다.

**Independent Test**: 설치 스크립트 실행 후 Claude Desktop 설정 파일에 travel과 che-ical-mcp 서버가 모두 등록되어 있는지 확인한다.

**Acceptance Scenarios**:

1. **Given** trip-planner가 설치되지 않은 macOS 환경, **When** 설치 스크립트를 실행, **Then** Claude Desktop 설정에 travel 서버와 che-ical-mcp 서버가 모두 등록된다
2. **Given** trip-planner가 이미 설치된 환경 (travel만 등록), **When** 설치 스크립트를 재실행, **Then** 기존 travel 설정은 유지되고 che-ical-mcp 서버가 추가 등록된다
3. **Given** 이미 che-ical-mcp가 독립 설치된 환경, **When** 설치 스크립트를 실행, **Then** 기존 che-ical-mcp 설정을 덮어쓰지 않고 유지한다

---

### User Story 2 - 설치 후 캘린더 기능 즉시 동작 (Priority: P2)

설치 완료 후 Claude Desktop을 재시작하면, 사용자가 "여행 일정 캘린더에 넣어줘"라고 말했을 때 캘린더 관련 MCP 도구가 정상 동작한다.

**Why this priority**: 설치만 되고 실제 동작하지 않으면 의미가 없다. che-ical-mcp의 실행 환경(Node.js/npx)이 갖춰져야 한다.

**Independent Test**: 설치 후 Claude Desktop에서 `list_calendars`를 호출하여 캘린더 목록이 반환되는지 확인한다.

**Acceptance Scenarios**:

1. **Given** 설치 완료 후 Claude Desktop 재시작, **When** 캘린더 목록 조회 요청, **Then** Apple 캘린더 목록이 정상 반환된다
2. **Given** Node.js가 설치되지 않은 환경, **When** 설치 스크립트 실행, **Then** che-ical-mcp 설치를 건너뛰고 사용자에게 Node.js 필요 안내 메시지를 표시한다

---

### Edge Cases

- Node.js/npx가 없는 환경에서 che-ical-mcp 설치 실패 시 travel 서버 설치는 정상 완료되어야 한다
- che-ical-mcp가 이미 다른 이름(예: calendar)으로 등록된 경우 중복 등록 방지
- Linux 환경에서는 Apple 캘린더가 없으므로 che-ical-mcp가 무의미하다 (macOS 전용 안내)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 설치 스크립트는 travel MCP 서버와 함께 che-ical-mcp 서버를 Claude Desktop 설정에 등록해야 한다
- **FR-002**: che-ical-mcp 설치는 npx를 통해 실행되므로, Node.js/npm 존재 여부를 사전 확인해야 한다
- **FR-003**: Node.js가 없는 경우 che-ical-mcp 설치를 건너뛰되, travel 서버 설치는 정상 진행해야 한다
- **FR-004**: 기존 Claude Desktop 설정에 이미 che-ical-mcp 항목이 있으면 덮어쓰지 않아야 한다
- **FR-005**: .mcp.json에도 che-ical-mcp 서버 설정을 추가하여 Claude Code 환경에서도 사용 가능해야 한다
- **FR-006**: 완료 메시지에 캘린더 기능 사용 가능 여부를 표시해야 한다

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 설치 스크립트 1회 실행으로 travel + che-ical-mcp 모두 사용 가능 상태가 된다
- **SC-002**: Node.js 미설치 환경에서도 설치 스크립트가 오류 없이 완료된다 (캘린더 기능만 스킵)
- **SC-003**: 기존 사용자가 업데이트 시 기존 설정이 유실되지 않는다

## Assumptions

- che-ical-mcp는 npx로 실행 가능 (npm 패키지로 배포됨)
- macOS 전용 기능 (Apple 캘린더 의존)
- Claude Desktop 설정 파일 구조: `~/Library/Application Support/Claude/claude_desktop_config.json`
