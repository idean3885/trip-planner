---
description: "Task list for spec 052 — 활동 컬렉션 읽기 REST 표현 정비"
---

# Tasks: 활동 컬렉션 읽기 REST 표현 정비

**Input**: Design documents from `/specs/052-activity-collection-read/`
**Prerequisites**: plan.md, spec.md, quickstart.md

## Phase 1: US2 — 활동 표현 읽기 문서화 (발견 가능)

- [x] T001 [US2] 일자 단건 GET을 OpenAPI에 노출 — `GET /api/trips/{id}/days/{dayId}` 메서드 + 응답에 activities 배열 스키마/예시 추가 [artifact: src/lib/openapi.ts] [why: read-doc]
- [x] T002 [US2] Day 스키마에 activities 필드 정의 + 활동 목록 GET(`.../activities`) 응답 스키마와 활동 필드 구성 정합 확인 [artifact: src/lib/openapi.ts] [why: read-doc]

## Phase 2: US1·US3 — 트립 GET 활동 표현 확장

- [x] T003 [US1][US3] 트립 GET에 `?include=activities` 파싱 추가 — 지정 시 days→activities 전체 표현 include, 미지정 시 기존 `_count.activities` 유지(하위호환) [artifact: src/app/api/trips/<id>/route.ts] [why: trip-expand]
- [x] T004 [US1][US3] 트립 확장 응답을 OpenAPI에 문서화 — `include` 쿼리 파라미터 + 확장 응답 스키마/예시 [artifact: src/lib/openapi.ts] [why: trip-expand]

## Phase 3: 검증 — 읽기 동작·엣지 회귀

- [x] T005 트립 GET 확장 on/off 통합 테스트 — off=개수 유지, on=활동 표현+식별자 포함 [artifact: tests/api/trip-include-activities.test.ts] [why: read-tests]
- [x] T006 엣지 테스트 — 빈 일자→빈 목록, 비멤버→거부, 없는 trip/day→not-found [artifact: tests/api/activity-read-edge.test.ts] [why: read-tests]

## Phase 4: 검증 & 릴리즈

- [x] T007 전체 lint·typecheck·`npx vitest run` 통과 + quickstart Evidence 기록 [artifact: specs/052-activity-collection-read/quickstart.md] [why: read-tests]
- [ ] T008 towncrier 단편 작성(changes/744.feat.md) [artifact: changes/744.feat.md] [why: trip-expand]

## Dependencies

- T003 → T004 (확장 구현 → 그 응답 문서화)
- T001/T002 독립(문서화), T003 독립(구현)
- T005/T006 구현(T003)·문서(T001~T004) 후
- T007 마지막, T008 미체크 유지(release build가 단편 소비 — drift 오탐 방지)

## Notes

- 스키마 마이그레이션 없음(읽기 전용). MCP·FE 변경 없음.
- 활동 표현은 `startTimezone`/`endTimezone` 포함(부동 시간 원칙 VII).
- T008 미체크 유지(towncrier 단편 — release build 소비).
