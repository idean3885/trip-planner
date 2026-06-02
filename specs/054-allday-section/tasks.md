---
description: "Task list for spec 054 — 여행 상세 종일 섹션"
---

# Tasks: 여행 상세 종일 섹션

**Input**: Design documents from `/specs/054-allday-section/`
**Prerequisites**: plan.md, spec.md, quickstart.md

## Phase 1: 스키마 — Activity 종일 컬럼

- [x] T001 Activity 모델에 `allDay`(Boolean, 기본 false, `is_all_day`) 컬럼 추가 [artifact: prisma/schema.prisma] [why: allday-schema]
- [x] T002 마이그레이션 SQL — `activities.is_all_day` 컬럼 추가(기본 false), 헤더 schema-only [artifact: prisma/migrations/20260603000000_add_activity_allday/migration.sql] [migration-type: schema-only] [why: allday-schema]

## Phase 2: US1 — 종일/시간 분리 렌더

- [x] T003 [US1] ActivityList — 종일/시간 두 묶음 분리, 종일은 최상단 별도 섹션(기본 접힘, details/summary), 종일 0건이면 섹션 미표시 [artifact: src/components/ActivityList.tsx] [why: allday-section]
- [x] T004 [US1] 분리·기본 접힘·0건 미표시 렌더 테스트 [artifact: tests/components/activity-allday-section.test.tsx] [why: allday-section]

## Phase 3: US2 — 종일 지정 입력·표시

- [x] T005 [US2] ActivityForm — 종일 토글 추가, 종일이면 시작/종료 시각 입력 생략·검증 분기 [artifact: src/components/ActivityForm.tsx] [why: allday-input]
- [x] T006 [US2] ActivityCard — 종일이면 시간 범위 대신 "종일" 표시 [artifact: src/components/ActivityCard.tsx] [why: allday-input]
- [x] T007 [US2] POST/PUT 활동 라우트 — allDay 저장, 종일이면 시각 앵커를 그 날 00:00 로 [artifact: src/app/api/trips/<id>/days/<dayId>/activities/route.ts] [why: allday-input]

## Phase 4: US3 — 종일 외부 캘린더 반영

- [x] T008 [US3] ics.ts — 종일 활동을 `VALUE=DATE` 종일 이벤트로 분기, 시간 활동 회귀 없음 [artifact: src/lib/calendar/ics.ts] [why: allday-ics]

## Phase 5: 문서·검증

- [x] T009 OpenAPI — Activity 스키마 allDay + POST/PUT 요청 바디 allDay 노출 [artifact: src/lib/openapi.ts] [why: allday-tests]
- [x] T010 allDay 저장·종일 ICS·카드 "종일"·폼 분기 테스트 [artifact: tests/api/activity-allday.test.ts] [why: allday-tests]

## Phase 6: 검증 & 릴리즈

- [x] T011 전체 lint·typecheck·`npx vitest run` + 커버리지 100% + quickstart Evidence 기록 [artifact: specs/054-allday-section/quickstart.md] [why: allday-tests]
- [ ] T012 towncrier 단편 작성(changes/740.feat.md) [artifact: changes/740.feat.md] [why: allday-section]

## Dependencies

- T001 → T002 (모델 → 마이그레이션)
- T003/T005/T006/T007 는 T001 후(allDay 타입)
- T004/T010 구현 후, T009 라우트 후
- T011 마지막, T012 미체크 유지(release build 소비)

## Notes

- 기존 활동(allDay 미지정)은 false로 동작 불변(하위호환).
- 여러 날 가로 스패닝은 범위 밖(후속). MCP·dry-run 없음.
- T012 미체크 유지(towncrier 단편 — release build 소비).
