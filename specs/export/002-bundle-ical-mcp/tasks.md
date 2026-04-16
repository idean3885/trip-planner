# Tasks: 설치 스크립트에 che-ical-mcp 번들 추가

**Input**: Design documents from `/specs/002-bundle-ical-mcp/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: 변경 대상 파일 확인 및 사전 준비

- [x] T001 che-ical-mcp GitHub Releases API 응답 구조 확인 및 다운로드 URL 패턴 검증

---

## Phase 2: US1 - 원클릭 설치로 travel + calendar MCP 모두 등록 (Priority: P1) 🎯 MVP

**Goal**: install.sh 실행 시 CheICalMCP 바이너리를 다운로드하고 Claude Desktop 설정에 등록

**Independent Test**: 설치 스크립트 실행 후 `~/.trip-planner/bin/CheICalMCP` 존재 + Claude Desktop config에 `che-ical-mcp` 항목 등록 확인

### Implementation

- [x] T002 [US1] install.sh에 macOS 체크 로직 추가 (`uname -s` == Darwin) — scripts/install.sh
- [x] T003 [US1] install.sh에 CheICalMCP 바이너리 다운로드 섹션 추가 (GitHub Releases API → `~/.trip-planner/bin/CheICalMCP`) — scripts/install.sh
- [x] T004 [US1] install.sh의 Claude Desktop 설정 Python 블록에 che-ical-mcp 서버 항목 추가 (기존 항목 있으면 스킵) — scripts/install.sh
- [x] T005 [P] [US1] .mcp.json에 che-ical-mcp 서버 설정 추가 — .mcp.json
- [x] T006 [US1] install.sh 완료 메시지에 캘린더 기능 상태 표시 (설치됨/스킵됨) — scripts/install.sh

**Checkpoint**: install.sh 실행 시 travel + che-ical-mcp 모두 등록 확인

---

## Phase 3: US2 - 설치 후 캘린더 기능 즉시 동작 (Priority: P2)

**Goal**: 설치 완료 후 실제 캘린더 MCP 도구가 동작하는지 검증

**Independent Test**: Claude Desktop 재시작 후 `list_calendars` 호출하여 캘린더 목록 반환 확인

### Implementation

- [x] T007 [US2] macOS가 아닌 환경에서 che-ical-mcp 설치 스킵 시 안내 메시지 출력 — scripts/install.sh
- [ ] T008 [US2] quickstart.md 시나리오대로 신규/업데이트/기존독립설치 3가지 케이스 수동 검증 — specs/002-bundle-ical-mcp/quickstart.md

**Checkpoint**: 3가지 설치 시나리오 모두 정상 동작 확인

---

## Phase 4: Polish & Cross-Cutting

**Purpose**: 문서 업데이트 및 정리

- [x] T009 [P] README.md에 캘린더 기능 설치 안내 추가 — README.md
- [x] T010 [P] claude_desktop_config.example.json에 che-ical-mcp 예시 추가 — claude_desktop_config.example.json

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 즉시 시작 가능
- **Phase 2 (US1)**: T001 완료 후 시작. T002→T003→T004 순서 필수 (같은 파일 순차 수정). T005는 독립 병렬 가능.
- **Phase 3 (US2)**: Phase 2 완료 후 검증
- **Phase 4 (Polish)**: Phase 2 완료 후 병렬 가능

### Within Phase 2

```
T002 (macOS 체크) → T003 (바이너리 다운로드) → T004 (config 등록) → T006 (완료 메시지)
                                                                    ↗
T005 (.mcp.json) ─────────────────────────────────────────────────
```

---

## Implementation Strategy

### MVP (US1만)

1. T001: API 구조 확인
2. T002~T006: install.sh + .mcp.json 수정
3. 로컬에서 설치 테스트
4. PR 생성

### Full Delivery

1. MVP 완료
2. T007~T008: 엣지 케이스 + 검증
3. T009~T010: 문서 업데이트

---

## Notes

- install.sh 수정은 같은 파일이므로 T002→T003→T004→T006 순차 처리
- .mcp.json(T005)은 독립 파일이므로 병렬 가능
- macOS 전용 기능이므로 Linux 환경에서는 전체 스킵
