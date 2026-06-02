---
description: "Task list for spec 042 — 토스트 보강 + 훅/라이브러리 정비"
---

# Tasks: 토스트 인터랙션 보강 + 훅/라이브러리 정비

**Input**: Design documents from `/specs/042-cleanup-toast/`
**Prerequisites**: plan.md, spec.md, quickstart.md

## Phase 1: US1 — 인터랙션 성공 토스트 (Priority: P1)

- [x] T001 [US1] ActivityList 일정 추가·수정·삭제 성공 시 toast.success 추가(기존 실패 토스트 유지) [artifact: src/components/ActivityList.tsx] [why: toast]
- [x] T002 [US1] ActivityList 성공 토스트 호출 단위테스트(추가/삭제) [artifact: tests/components/activity-toast.test.tsx] [why: toast]

## Phase 2: US2 — 스와이프 단일화 + 미사용 제거 (Priority: P2)

- [ ] T003 [US2] 미사용 MobileSwipeShell 컴포넌트 + 테스트 제거 [artifact: src/components/trip/MobileSwipeShell.tsx] [why: swipe-cleanup]
- [x] T004 [US2] react-swipeable 의존성 제거(package.json) + 잔여 참조 0 확인 [artifact: package.json] [why: swipe-cleanup]

## Phase 3: US3 — 훅 인벤토리

- [x] T005 커스텀 훅 현황 점검 기록(커스텀 훅 디렉토리 부재 확인) [artifact: specs/042-cleanup-toast/hook-inventory.md] [why: hook-inventory]

## Phase 4: 검증 & 릴리즈

- [x] T006 전체 lint·typecheck·vitest 통과 확인 [artifact: specs/042-cleanup-toast/quickstart.md] [why: toast]
- [ ] T007 towncrier 단편 작성 (changes/706.chore.md — What/이유, 합쇼체) [artifact: changes/706.chore.md] [why: swipe-cleanup]

## Dependencies

- T001 → T002 (토스트 후 테스트)
- T003 → T004 (컴포넌트 제거 후 의존성 제거)
- T006 마지막, T007 미체크 유지(release 소비)

## Notes

- T003 미체크 유지(삭제 태스크 — 산출물 부재가 정상, drift 오탐 방지).
- T007 미체크 유지(towncrier).
