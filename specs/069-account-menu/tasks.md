# Tasks: 헤더 계정 메뉴 통합

**Feature**: `069-account-menu` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

## Phase 1: Setup
- [x] T001 AuthButton 현황·dropdown-menu(base-ui) API 확인

## Phase 2: US1 — 계정 메뉴 (P1)
- [x] T002 [US1] `AuthButton`을 DropdownMenu 계정 메뉴로 전환 — 이니셜 원형 트리거 + 이메일 라벨·설정(Link)·구분선·로그아웃(signOut). `hidden sm:*` 뷰포트 분기 제거 [artifact: src/components/AuthButton.tsx] [why: account-menu]
- [x] T003 [P] [US1] 계정 메뉴 회귀 테스트 — flat 링크 대신 트리거+메뉴(이메일·설정·로그아웃) 렌더, 뷰포트 분기 클래스 부재 검증 [artifact: tests/components/account-menu.test.tsx] [why: account-menu]

## Phase 3: Polish
- [x] T004 자가검증 (`npx vitest run`) + 색상 가드
- [ ] T005 towncrier 단편 (release 단계 소비, 미체크 유지) [artifact: changes/946.feat.md] [why: account-menu]

## Dependencies
Setup → US1 → Polish.

## MVP Scope
US1 = 전부(단일 컴포넌트 교체).
