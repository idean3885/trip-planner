# Implementation Plan: 동행자 피드백 채널

**Branch**: `003-companion-feedback-channel` | **Date**: 2026-04-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-companion-feedback-channel/spec.md`

## Summary

동행자가 AI 에이전트를 통해 여행 일정 보완 요청과 디자인 피드백을 개발자에게 전달할 수 있는 소통 채널을 구축한다. 공식 GitHub MCP 서버가 디스커션 생성을 지원하지 않으므로(R-001), GitHub GraphQL API를 활용하는 커스텀 Python MCP 서버를 구현하고 install.sh에 통합한다.

## Technical Context

**Language/Version**: Python 3.10+ (기존 travel_mcp과 동일), Bash (install.sh)
**Primary Dependencies**: FastMCP, httpx (기존 의존성 재활용)
**Storage**: macOS Keychain (GitHub PAT 저장)
**Testing**: 수동 E2E (설치 → Claude Desktop → 디스커션 생성 확인)
**Target Platform**: macOS (프로젝트 제약)
**Project Type**: MCP 서버 + CLI 설치 스크립트
**Performance Goals**: N/A
**Constraints**: 비개발자 사용 — JSON 편집 불가, CLI 도구 설치 불가
**Scale/Scope**: MCP 서버 모듈 1개 + install.sh 수정

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AX-First | ✅ Pass | AI 에이전트가 자연어 요청을 분석하여 디스커션 초안을 작성·게시. 사용자는 API를 직접 호출하지 않음 |
| II. Minimum Cost | ✅ Pass | GitHub Discussions 무료. 기존 FastMCP/httpx 의존성 재활용. 별도 AI API 과금 없음 |
| III. Mobile-First Delivery | ✅ Pass | 디스커션 게시물은 모바일 브라우저에서 열람 가능 |
| IV. Incremental Release | ✅ Pass | 기존 travel/calendar 기능 불변. 소통 채널만 추가. 설치 실패 시에도 기존 기능 정상 동작 |

## Project Structure

### Documentation (this feature)

```text
specs/003-companion-feedback-channel/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── spec.md              # Feature spec
├── quickstart.md        # 검증 시나리오
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
src/
└── feedback_mcp/            # 신규: 피드백 MCP 서버
    ├── __init__.py
    ├── server.py            # FastMCP 서버 (도구 정의)
    └── github_client.py     # GitHub GraphQL API 클라이언트 (키체인 지원)

scripts/
└── install.sh               # 수정: GitHub PAT 설정 + feedback MCP 등록 섹션 추가
```

**Structure Decision**: travel_mcp과 동일한 패턴으로 별도 MCP 서버 모듈을 생성한다. 관심사 분리(여행 검색 vs 피드백 채널)를 유지하면서 install.sh 한 줄 설치 경험을 보존한다.

## Design Decisions

### D-001: MCP 도구 설계

| 도구 | 설명 | GraphQL Operation |
|------|------|-------------------|
| `create_feedback` | 디스커션 생성 (제목, 본문, 분류) | `createDiscussion` mutation |
| `list_feedback` | 기존 디스커션 목록 조회 | `discussions` query |
| `list_categories` | 사용 가능한 카테고리 목록 | `discussionCategories` query |

- AI 에이전트가 `list_categories`로 카테고리 ID를 확인한 뒤 `create_feedback`으로 게시
- 제목에 `[일정]` / `[디자인]` prefix를 AI가 자동 부여 (R-004)

### D-002: 인증 흐름

```
install.sh 실행
  → 키체인에서 기존 GitHub PAT 확인
  → 없으면: fine-grained PAT 발급 가이드 출력 → 입력 → 키체인 저장
  → 있으면: 기존 토큰 재사용

MCP 서버 실행 시
  → 키체인에서 PAT 읽기 (security find-generic-password)
  → 폴백: GITHUB_PERSONAL_ACCESS_TOKEN 환경변수
```

### D-003: install.sh 수정 범위

기존 구조에 섹션 추가:
```
1. Python 확인           (기존)
2. 저장소 복제            (기존)
3. 가상환경 생성          (기존)
4. 의존성 설치            (기존)
5. RapidAPI 키 설정       (기존)
6. che-ical-mcp 설치      (기존)
7. GitHub PAT 설정        ← 신규
8. Claude Desktop 설정    (수정: feedback 서버 추가)
9. 완료 메시지            (수정: 피드백 기능 안내 추가)
```

GitHub PAT 입력은 선택사항(Enter로 건너뛰기). 건너뛴 경우 feedback MCP는 등록하지 않는다.
