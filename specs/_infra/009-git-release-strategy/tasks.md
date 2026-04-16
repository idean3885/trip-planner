# Tasks: Git 브랜치/릴리즈 전략

**Input**: Design documents from `/specs/009-git-release-strategy/`

---

## Phase 1: CI 워크플로우 개선

- [ ] T001 Modify auto-tag.yml — lightweight → annotated 태그, 릴리즈 메시지 포함
- [ ] T002 Create auto-release.yml — 태그 push 시 CHANGELOG 추출 → GitHub Release 생성

## Phase 2: 문서화

- [ ] T003 Add release process section to CLAUDE.md

## Phase 3: 정리

- [ ] T004 Delete stale local branches (feature/3, feature/67)
- [ ] T005 Convert v2.1.0 lightweight tag to annotated tag
