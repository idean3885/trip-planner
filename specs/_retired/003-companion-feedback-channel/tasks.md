# Tasks: 동행자 피드백 채널

**Input**: Design documents from `/specs/003-companion-feedback-channel/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: 피드백 MCP 서버 패키지 구조 생성

- [x] T001 feedback_mcp 패키지 디렉토리 및 __init__.py 생성 — src/feedback_mcp/__init__.py

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: US1, US3 모두에 필요한 공통 인프라

- [x] T002 GitHub GraphQL API 클라이언트 구현 (키체인 읽기 + httpx + createDiscussion/discussions/discussionCategories) — src/feedback_mcp/github_client.py
- [x] T003 [P] pyproject.toml에 feedback_mcp 모듈 엔트리포인트 등록 — pyproject.toml

**Checkpoint**: `python -m feedback_mcp.github_client` 임포트 가능, 키체인에서 토큰 읽기 동작 확인

---

## Phase 3: US1 - 일정 보완 요청 전달 (Priority: P1) 🎯 MVP

**Goal**: AI 에이전트가 동행자의 자연어 요청을 받아 GitHub Discussion으로 게시

**Independent Test**: Claude Desktop에서 "둘째 날 저녁 식당 추가해줘"라고 요청 → Discussion 생성 확인

### Implementation

- [x] T004 [US1] FastMCP 서버 초기화 + list_categories 도구 구현 (discussionCategories GraphQL query) — src/feedback_mcp/server.py
- [x] T005 [US1] create_feedback 도구 구현 (createDiscussion GraphQL mutation, 제목/본문/카테고리ID 매개변수) — src/feedback_mcp/server.py
- [x] T006 [US1] list_feedback 도구 구현 (discussions GraphQL query, 최근 N건 조회) — src/feedback_mcp/server.py

**Checkpoint**: 로컬에서 MCP 서버 실행 → create_feedback 호출 → GitHub Discussion 생성 확인

---

## Phase 4: US3 - 인증 자동 설정 (Priority: P1)

**Goal**: install.sh에 GitHub PAT 설정을 통합하여 비개발자도 한 줄 설치로 피드백 기능 사용 가능

**Independent Test**: install.sh 실행 → 키체인에 github-pat 저장 → Claude Desktop 설정에 feedback 서버 등록 확인

### Implementation

- [x] T007 [US3] install.sh에 GitHub PAT 설정 섹션 추가 (키체인 확인 → 없으면 fine-grained PAT 발급 가이드 + 입력 → 키체인 저장, Enter로 건너뛰기 지원) — scripts/install.sh
- [x] T008 [US3] install.sh Claude Desktop 설정 Python 블록에 feedback 서버 항목 추가 (PAT 입력 시에만, 기존 항목 있으면 스킵) — scripts/install.sh
- [x] T009 [US3] install.sh 완료 메시지에 피드백 기능 상태 표시 (설정됨/스킵됨, 사용법 안내) — scripts/install.sh

**Checkpoint**: install.sh 실행 → travel + calendar + feedback 모두 Claude Desktop에 등록 확인

---

## Phase 5: US2 - 디자인 피드백 전달 (Priority: P2)

**Goal**: 일정 보완과 동일한 도구로 디자인 피드백도 게시 가능하며, 제목 prefix로 구분됨

**Independent Test**: Claude Desktop에서 "모바일에서 표가 잘려 보여"라고 피드백 → [디자인] prefix가 붙은 Discussion 생성 확인

### Implementation

- [x] T010 [US2] quickstart.md 시나리오대로 일정 보완([일정]) + 디자인 피드백([디자인]) 수동 검증 — specs/003-companion-feedback-channel/quickstart.md

**Checkpoint**: 일정/디자인 피드백이 각각 [일정]/[디자인] prefix로 Discussion에 게시됨

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: 문서 업데이트

- [x] T011 [P] README.md에 피드백 채널 기능 안내 추가 (사용법, GitHub PAT 발급 방법) — README.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 즉시 시작 가능
- **Phase 2 (Foundational)**: Phase 1 완료 후 시작. T002, T003 병렬 가능
- **Phase 3 (US1)**: Phase 2 완료 후 시작. T004→T005→T006 순서 (같은 파일 순차 수정)
- **Phase 4 (US3)**: Phase 3 완료 후 시작 (MCP 서버가 존재해야 install.sh에서 등록 가능)
- **Phase 5 (US2)**: Phase 4 완료 후 검증 (설치 완료 상태에서 E2E 테스트)
- **Phase 6 (Polish)**: Phase 3 완료 후 병렬 가능

### Within Phases

```
T001 (패키지 생성)
  ↓
T002 (github_client) ─┐
T003 (pyproject.toml) ─┤ 병렬
  ↓
T004 (list_categories) → T005 (create_feedback) → T006 (list_feedback)
  ↓
T007 (PAT 설정) → T008 (Desktop 설정) → T009 (완료 메시지)
  ↓
T010 (디자인 피드백 검증)

T011 (README) ─── Phase 3 이후 언제든 병렬 가능
```

---

## Implementation Strategy

### MVP (US1 + US3)

1. T001: 패키지 구조 생성
2. T002~T003: 클라이언트 + pyproject.toml (병렬)
3. T004~T006: MCP 도구 3개 구현
4. T007~T009: install.sh 수정
5. 로컬에서 E2E 테스트
6. PR 생성

### Full Delivery

1. MVP 완료
2. T010: 디자인 피드백 검증
3. T011: README 업데이트

---

## Notes

- install.sh 수정은 같은 파일이므로 T007→T008→T009 순차 처리
- server.py 수정도 같은 파일이므로 T004→T005→T006 순차 처리
- github_client.py(T002)와 pyproject.toml(T003)은 독립 파일이므로 병렬 가능
- US2는 추가 코드 없이 US1 도구를 재활용 — AI 에이전트가 제목 prefix를 자율적으로 부여
