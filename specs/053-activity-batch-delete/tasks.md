---
description: "Task list for spec 053 — 활동·일자 다건 삭제 API"
---

# Tasks: 활동·일자 다건 삭제 API

**Input**: Design documents from `/specs/053-activity-batch-delete/`
**Prerequisites**: plan.md, spec.md, quickstart.md

## Phase 1: US1 — 활동 다건 삭제

- [x] T001 [US1] 활동 배치 삭제 POST 라우트 — body `{ ids }`, 여행 경계로 묶어 일괄 삭제, 삭제·건너뜀(deleted/skipped) 부분 성공 반환, 빈 입력 400·권한 403 [artifact: src/app/api/trips/<id>/activities/batch-delete/route.ts] [why: activity-batch]
- [x] T002 [US1] 활동 배치 삭제 후 외부 캘린더 자동 반영을 요청당 한 번(after) 호출 [artifact: src/app/api/trips/<id>/activities/batch-delete/route.ts] [why: activity-batch]

## Phase 2: US2 — 일자 다건 삭제

- [x] T003 [US2] 일자 배치 삭제 POST 라우트 — body `{ ids }`, 여행 경계 일괄 삭제(활동 cascade), 부분 성공 반환 [artifact: src/app/api/trips/<id>/days/batch-delete/route.ts] [why: day-batch]
- [x] T004 [US2] 일자 배치 삭제 후 외부 캘린더 자동 반영을 요청당 한 번 호출 [artifact: src/app/api/trips/<id>/days/batch-delete/route.ts] [why: day-batch]

## Phase 3: 문서화

- [x] T005 배치 삭제 두 경로 OpenAPI 노출 — 요청 `{ ids }`·응답 `{ deleted, skipped }`·예시 [artifact: src/lib/openapi.ts] [why: batch-doc]

## Phase 4: 검증

- [x] T006 활동 배치 삭제 테스트 — 부분 성공·여행 경계 보호·빈 입력 400·권한 403·자동 반영 1회 [artifact: tests/api/activity-batch-delete.test.ts] [why: batch-tests]
- [x] T007 일자 배치 삭제 테스트 — 활동 cascade·부분 성공·권한 [artifact: tests/api/day-batch-delete.test.ts] [why: batch-tests]

## Phase 5: 검증 & 릴리즈

- [x] T008 전체 lint·typecheck·`npx vitest run` 통과 + quickstart Evidence 기록 [artifact: specs/053-activity-batch-delete/quickstart.md] [why: batch-tests]
- [ ] T009 towncrier 단편 작성(changes/743.feat.md) [artifact: changes/743.feat.md] [why: batch-doc]

## Dependencies

- T001 → T002, T003 → T004 (라우트 → 자동 반영 부착)
- T005 라우트(T001~T004) 후, T006/T007 라우트 후
- T008 마지막, T009 미체크 유지(release build가 단편 소비)

## Notes

- 단건 삭제 라우트는 변경하지 않는다(배치는 additive).
- 데이터 모델 변경 없음(삭제 연산만). MCP·FE 변경 없음.
- T009 미체크 유지(towncrier 단편 — release build 소비).
