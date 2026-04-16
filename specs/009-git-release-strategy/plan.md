# Implementation Plan: Git 브랜치/릴리즈 전략

**Branch**: `009-git-release-strategy` | **Date**: 2026-04-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-git-release-strategy/spec.md`

## Summary

1인 개발 프로젝트의 Git 전략을 Git Flow Lite (main + develop + feature)로 표준화한다. develop → alpha 배포, main → production 릴리즈로 환경을 분리하고, auto-tag/auto-release CI로 릴리즈를 자동화한다.

## Technical Context

**Language/Version**: YAML (GitHub Actions)
**Primary Dependencies**: GitHub Actions, gh CLI, Vercel
**Storage**: N/A
**Testing**: 워크플로우 실행 후 수동 확인
**Target Platform**: GitHub + Vercel
**Project Type**: CI/CD 워크플로우 + 브랜치 전략
**Constraints**: `AUTO_TAG_PAT` 시크릿 필요, Vercel develop 브랜치 배포 설정 필요

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AX-First | N/A | 인프라 작업 |
| II. Minimum Cost | PASS | GitHub Actions 무료 티어 내 |
| III. Mobile-First | N/A | |
| IV. Incremental Release | PASS | 마일스톤 단위 릴리즈로 점진적 배포 강화 |

## Git 전략 설계

### 브랜치 전략: Git Flow Lite

```
main ────────────●───────────────●──── (production: trip.idean.me)
                 ↑               ↑
develop ──●──●──●───●──●──●──●──● ── (alpha: alpha.trip.idean.me)
          ↑  ↑  ↑   ↑  ↑  ↑  ↑
        feat feat feat feat feat feat  (NNN-short-name)
```

- **main**: 프로덕션 브랜치. trip.idean.me 배포. 버전 태그가 붙는 유일한 브랜치.
- **develop**: 통합 브랜치. alpha.trip.idean.me 배포. feature가 여기로 머지.
- **feature**: `NNN-short-name` 형식. develop으로 PR 머지.
- hotfix/release 브랜치 불필요 (1인 개발).

### 배포 환경 매핑

| 브랜치 | 도메인 | 용도 |
|--------|--------|------|
| main | trip.idean.me | 프로덕션 릴리즈 |
| develop | alpha.trip.idean.me | 마일스톤 통합 테스트 |
| feature/* | PR 프리뷰 URL | 피처 단위 프리뷰 |

### 태그 전략

- **형식**: `vX.Y.Z` (Semantic Versioning)
- **종류**: Annotated tag (메시지 포함)
- **생성 시점**: develop → main 머지 시 pyproject.toml 버전 변경 감지 (CI 자동)

### 릴리즈 워크플로우

```
개발 (마일스톤 진행 중):
  feature → develop PR → 머지 → alpha 자동 배포

릴리즈 (마일스톤 완료 시):
  1. CHANGELOG.md + pyproject.toml 버전 범프 (develop에서)
  2. develop → main PR → 머지

CI 자동 (main 머지 후):
  3. auto-tag.yml: annotated 태그 생성
  4. auto-release.yml: CHANGELOG 추출 → GitHub Release 생성
  5. pypi-publish.yml: 테스트 → PyPI 배포
```

## Project Structure

```text
.github/workflows/
├── auto-tag.yml       # MODIFY — lightweight → annotated 태그 (main 전용)
├── auto-release.yml   # NEW — CHANGELOG 기반 Release 자동 생성
└── pypi-publish.yml   # 기존 유지

CLAUDE.md              # MODIFY — 브랜치 전략 + 릴리즈 프로세스 문서화
```

## 추가 작업

- develop 브랜치 생성 (main에서 분기)
- develop 브랜치 보호 규칙 설정
- Vercel에서 develop → alpha.trip.idean.me 도메인 연결
