# Tasks: Git 브랜치/릴리즈 전략

**Input**: Design documents from `/specs/_infra/009-git-release-strategy/`
**Metatag retrofit**: #215 Phase B (2026-04-17)

---

## Phase 1: CI 워크플로우 개선

- [x] T001 Modify auto-tag.yml — lightweight → annotated 태그, 릴리즈 메시지 포함 [artifact: .github/workflows/auto-tag.yml] [why: ci-auto-tag]
- [x] T002 Create auto-release.yml — 태그 push 시 CHANGELOG 추출 → GitHub Release 생성 [artifact: .github/workflows/auto-release.yml] [why: ci-auto-release]

## Phase 2: 문서화

- [x] T003 Add release process section to CLAUDE.md [artifact: CLAUDE.md] [why: release-docs]

## Phase 3: 정리

- [x] T004 Delete stale local branches (feature/3, feature/67) [why: cleanup]
- [x] T005 Convert v2.1.0 lightweight tag to annotated tag [why: cleanup]

> T004/T005는 Git 레포 상태 변경(브랜치 삭제·태그 재작성)이라 파일 아티팩트가 없다. `[artifact]`를 생략하고 drift 감사는 스킵한다 (검증기는 `[artifact]` 없는 태스크를 무시).
