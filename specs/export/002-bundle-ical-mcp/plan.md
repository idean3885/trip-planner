# Implementation Plan: 설치 스크립트에 che-ical-mcp 번들 추가

**Branch**: `002-bundle-ical-mcp` | **Date**: 2026-04-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-bundle-ical-mcp/spec.md`

## Summary

trip-planner 설치 스크립트(`scripts/install.sh`)를 수정하여, 기존 travel MCP 서버와 함께 che-ical-mcp(Apple 캘린더 MCP) 서버를 한 세트로 설치한다. Node.js가 없는 환경에서는 캘린더 기능만 스킵하고 travel은 정상 설치된다.

## Technical Context

**Language/Version**: Bash (install.sh), Python 3.10+ (JSON 설정 조작)
**Primary Dependencies**: che-ical-mcp (npm 패키지, npx로 실행)
**Storage**: N/A
**Testing**: 수동 E2E (설치 스크립트 실행 → Claude Desktop 설정 확인)
**Target Platform**: macOS (Apple 캘린더 의존)
**Project Type**: CLI 설치 스크립트
**Performance Goals**: N/A
**Constraints**: Node.js 미설치 환경에서도 오류 없이 완료
**Scale/Scope**: 단일 스크립트 수정 + .mcp.json 업데이트

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AX-First | ✅ Pass | 캘린더 연동은 AI가 일정→캘린더 변환을 수행하는 AX 기능. 설치를 통합하여 사용자가 별도 설정 없이 사용 가능 |
| II. Minimum Cost | ✅ Pass | che-ical-mcp는 무료 npm 패키지. npx 실행으로 추가 비용 없음 |
| III. Mobile-First Delivery | ✅ Pass | 캘린더 이벤트는 iPhone에서 바로 확인 가능. 모바일 경험 향상 |
| IV. Incremental Release | ✅ Pass | 기존 travel 설치에 캘린더를 추가하는 증분 변경. 기존 기능 불변 |

## Project Structure

### Documentation (this feature)

```text
specs/002-bundle-ical-mcp/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── spec.md              # Feature spec
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
scripts/
└── install.sh           # 수정 대상: che-ical-mcp 설치 로직 추가

.mcp.json                # 수정 대상: che-ical-mcp 서버 설정 추가
```

**Structure Decision**: 기존 install.sh에 섹션을 추가하는 단순 수정. 새 파일 생성 불필요.
