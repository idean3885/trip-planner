# Research: 동행자 피드백 채널

**Date**: 2026-04-07
**Feature**: 003-companion-feedback-channel

## R-001: 소통 채널 구현 방식

### 결정: GitHub Discussions + 커스텀 Python MCP 서버

### 조사 내용

**공식 GitHub MCP 서버 (`github/github-mcp-server`)**:
- Go 바이너리 (npm 패키지 아님, `npx` 불가)
- 디스커션 관련 도구: `list_discussions`, `get_discussion`, `get_discussion_comments`, `list_discussion_categories` (읽기 전용)
- **`create_discussion` 미지원** — [Issue #1171](https://github.com/github/github-mcp-server/issues/1171) 으로 요청 중, 미해결
- 인증: `GITHUB_PERSONAL_ACCESS_TOKEN` 환경변수

**deprecated 패키지 (`@modelcontextprotocol/server-github`)**:
- npm 패키지이나 더 이상 유지보수되지 않음
- 공식 서버로 대체됨 — 사용 불가

### 대안 평가

| 대안 | 장점 | 단점 | 판정 |
|------|------|------|------|
| A. 커스텀 Python MCP 서버 | 기존 스택(Python, FastMCP) 재활용, 키체인 패턴 재사용, 전체 제어 가능 | 새 모듈 추가 | **채택** |
| B. travel_mcp에 디스커션 도구 추가 | 기존 서버 재활용 | 여행 검색과 피드백의 관심사 혼합 | 기각 |
| C. gh CLI 래퍼 스크립트 | 단순 | gh CLI 설치 필수 (비개발자 부담), 비표준 MCP | 기각 |
| D. 공식 GitHub MCP 서버 대기 | 공식 지원 | create_discussion 미지원, 일정 불확실 | 기각 |

### 근거

- 대안 A는 기존 travel_mcp와 동일한 패턴(Python + FastMCP + 키체인)을 따르므로 install.sh에 자연스럽게 통합된다
- GitHub GraphQL API의 `createDiscussion` mutation으로 디스커션 생성이 가능하다
- `list_discussion_categories` 도 GraphQL로 직접 구현하여 카테고리 분류(일정/디자인)를 지원한다
- 비개발자는 추가 도구 설치 없이 install.sh 한 줄로 모든 설정이 완료된다

## R-002: GitHub PAT 권한 범위

### 결정: Fine-grained PAT (Repository-scoped)

| 항목 | 값 |
|------|-----|
| Repository access | Only select repositories → `idean3885/trip-planner` |
| Discussions | Read and write |
| Metadata | Read (기본 포함) |

### 근거

- Classic PAT의 `repo` 스코프는 과도한 권한 (전체 레포 접근)
- Fine-grained PAT는 특정 레포 + 특정 권한만 부여 가능
- 비개발자에게 최소 권한만 부여하는 것이 안전

## R-003: 키체인 + MCP 서버 인증 패턴

### 결정: 키체인 직접 읽기 (travel_mcp 동일 패턴)

기존 travel_mcp의 `api_client.py` 패턴을 그대로 재사용:
```
키체인 서비스: trip-planner
키체인 계정: github-pat
런타임 읽기: subprocess.run(["security", "find-generic-password", ...])
폴백: GITHUB_PERSONAL_ACCESS_TOKEN 환경변수
```

### 근거

- 래퍼 스크립트 불필요 — Python MCP 서버가 직접 키체인에서 읽음
- 환경변수 폴백으로 키체인이 없는 환경에서도 동작
- install.sh의 기존 키체인 저장 로직 재사용

## R-004: 디스커션 카테고리 분류

### 결정: 단일 카테고리 + AI 자동 제목 태깅

- 디스커션 카테고리를 별도로 만들지 않고, 기존 "General" 등 카테고리 활용
- AI 에이전트가 제목에 `[일정]` 또는 `[디자인]` prefix를 자동 부여
- 개발자가 한눈에 분류를 파악할 수 있음

### 근거

- 카테고리 생성은 레포 관리자 권한이 필요하여 자동화 곤란
- 제목 prefix는 AI 에이전트가 자율적으로 처리 가능
- 스펙 FR-002 "분류 체계"를 가장 단순하게 충족
