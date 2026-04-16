# Implementation Plan: Git 브랜치/릴리즈 전략

**Branch**: `009-git-release-strategy` | **Date**: 2026-04-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-git-release-strategy/spec.md`

## Summary

1인 개발 프로젝트의 Git 전략을 GitHub Flow 기반으로 표준화한다. auto-tag를 annotated 태그로 전환하고, auto-release 워크플로우를 추가하여 CHANGELOG 기반 Release 자동 생성을 구현한다.

## Technical Context

**Language/Version**: YAML (GitHub Actions)
**Primary Dependencies**: GitHub Actions, gh CLI
**Storage**: N/A
**Testing**: 워크플로우 실행 후 수동 확인
**Target Platform**: GitHub
**Project Type**: CI/CD 워크플로우
**Constraints**: `AUTO_TAG_PAT` 시크릿 필요, GitHub Free 플랜 Actions 제한

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AX-First | N/A | 인프라 작업 |
| II. Minimum Cost | PASS | GitHub Actions 무료 티어 내 |
| III. Mobile-First | N/A | |
| IV. Incremental Release | PASS | 릴리즈 자동화로 점진적 릴리즈 지원 강화 |

## Git 전략 설계

### 브랜치 전략: GitHub Flow

```
main ─────●──────●──────●──────●───── (항상 배포 가능)
           \    /  \    /
            feat1    feat2     (NNN-short-name 피처 브랜치)
```

- **main**: 유일한 장기 브랜치. 항상 배포 가능 상태.
- **feature**: `NNN-short-name` 형식 (speckit 자동 생성). PR로만 머지.
- **release 브랜치 불필요**: 1인 개발 + main 직접 릴리즈.
- **develop 브랜치 불필요**: feature → main PR로 충분.

### 태그 전략

- **형식**: `vX.Y.Z` (Semantic Versioning)
- **종류**: Annotated tag (메시지 포함)
- **생성 시점**: pyproject.toml 버전 변경이 main에 머지될 때 (CI 자동)
- **메시지**: `Release vX.Y.Z`

### 릴리즈 워크플로우

```
개발자 수동:
  1. CHANGELOG.md에 새 버전 섹션 추가
  2. pyproject.toml version 범프
  3. PR 생성 → 머지

CI 자동:
  4. auto-tag.yml: pyproject.toml 변경 감지 → annotated 태그 생성 + push
  5. auto-release.yml: 태그 push 감지 → CHANGELOG 추출 → GitHub Release 생성
  6. pypi-publish.yml: 태그 push 감지 → 테스트 → PyPI 배포 (기존)
```

### 버전 범프 기준 (SemVer)

- **MAJOR**: 호환성 깨지는 변경 (API 스키마 변경, 기존 MCP 도구 삭제 등)
- **MINOR**: 기능 추가 (새 API, 새 MCP 도구, 새 페이지 등)
- **PATCH**: 버그 수정, 성능 개선, 문서 수정

## Project Structure

```text
.github/workflows/
├── auto-tag.yml       # MODIFY — lightweight → annotated 태그
└── auto-release.yml   # NEW — CHANGELOG 기반 Release 자동 생성
└── pypi-publish.yml   # 기존 유지

CLAUDE.md              # MODIFY — 릴리즈 프로세스 문서 추가
```
