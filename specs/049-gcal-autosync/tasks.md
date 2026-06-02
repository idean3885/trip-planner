---
description: "Task list for spec 049 — 활동 변경 시 외부 캘린더 자동 반영"
---

# Tasks: 활동 변경 시 외부 캘린더 자동 반영

**Input**: Design documents from `/specs/049-gcal-autosync/`
**Prerequisites**: plan.md, spec.md, quickstart.md

## Phase 1: US1 — 자동 반영 트리거

- [x] T001 [US1] 자동 반영 헬퍼 — syncCalendar 재사용, 미연결(404)·실패 삼키고 로그 [artifact: src/lib/calendar/auto-sync.ts] [why: autosync]
- [x] T002 [US1] 활동 생성 라우트에 after() 자동 반영 [artifact: src/app/api/trips/<id>/days/<dayId>/activities/route.ts] [why: autosync]
- [x] T003 [US1] 활동 수정·삭제 라우트에 after() 자동 반영 [artifact: src/app/api/trips/<id>/days/<dayId>/activities/<activityId>/route.ts] [why: autosync]
- [x] T004 [US1] 가져오기 확정(개별·일괄) 라우트에 after() 자동 반영 [artifact: src/app/api/trips/<id>/drafts/promote-batch/route.ts] [why: autosync]

## Phase 2: 검증 & 릴리즈

- [x] T005 [US1] 자동 반영 헬퍼 단위테스트(미연결 skip·실패 무해·연결 시 호출) [artifact: tests/lib/calendar-auto-sync.test.ts] [why: autosync]
- [ ] T006 towncrier 단편 작성(changes/715.fix.md) [artifact: changes/715.fix.md] [why: autosync]

## Dependencies

- T001 → T002, T003, T004 (헬퍼 먼저)
- T005 헬퍼 완성 후, T006 미체크 유지(release 소비)

## Notes

- T006 미체크 유지(towncrier 단편 — release build 소비, drift 오탐 방지).
- 정렬 PATCH 는 외부 이벤트 내용 불변이라 트리거 제외.
- Apple link 도 syncCalendar 분기로 함께 해소(별도 트리거 불요).
