# Tasks: Day 스키마 재설계 + API v2 신설 (v2.7.0)

**Feature**: 015-day-schema-redesign | **Date**: 2026-04-20

## US1 - MCP 무중단 (P1)

- [ ] T001 v1 어댑터 — `/api/trips/<id>/days/route.ts` GET이 `dayNumber` 파생 후 `sortOrder` 키로 응답 [artifact: src/app/api/trips/<id>/days/route.ts] [why: v1-adapter]
- [ ] T002 v1 어댑터 — `/api/trips/<id>/days/<dayId>/route.ts` GET 동일 매핑 [artifact: src/app/api/trips/<id>/days/<dayId>/route.ts] [why: v1-adapter]
- [ ] T003 v1 호환 테스트 (sortOrder 키 정수 응답 보장) [artifact: tests/api/v1-compat.test.ts] [why: tests]

## US2 - 웹 UI dayNumber 기반 (P2)

- [ ] T010 v2 API GET `/api/v2/trips/<id>` Trip 상세 + days dayNumber 포함 [artifact: src/app/api/v2/trips/<id>/route.ts] [why: v2-api]
- [ ] T011 v2 API days CRUD `/api/v2/trips/<id>/days/...` [artifact: src/app/api/v2/trips/<id>/days/route.ts] [why: v2-api]
- [ ] T012 dayNumber 계산 헬퍼 [artifact: src/lib/day-number.ts] [why: schema-expand]
- [ ] T013 expand 마이그레이션 — Trip.startDate NOT NULL + Day @@unique([tripId, date]) [artifact: prisma/migrations/20260420000000_v270_expand_day_constraints/migration.sql] [why: schema-expand] [migration-type: schema-only]
- [ ] T014 Prisma 스키마 업데이트 [artifact: prisma/schema.prisma] [why: schema-expand]
- [ ] T015 웹 UI fetch v2 전환 — `src/app/trips/<id>/page.tsx` [artifact: src/app/trips/<id>/page.tsx] [why: ui-migration]
- [ ] T016 웹 UI fetch v2 전환 — `src/app/trips/<id>/day/<dayId>/page.tsx` [artifact: src/app/trips/<id>/day/<dayId>/page.tsx] [why: ui-migration]
- [ ] T017 v2 응답 스키마 테스트 [artifact: tests/api/v2-days.test.ts] [why: tests]

## US3 - Trip 범위 자동 확장 (P3)

- [ ] T020 자동 확장 헬퍼 — Day POST/PUT 시 startDate/endDate 보정 [artifact: src/lib/day-number.ts::expandTripRangeIfNeeded] [why: range-autoexpand]
- [ ] T021 v2 POST/PUT에 자동 확장 적용 [artifact: src/app/api/v2/trips/<id>/days/route.ts::POST] [why: range-autoexpand]
- [ ] T022 자동 확장 E2E 테스트 [artifact: tests/api/range-autoexpand.test.ts] [why: tests]

## 릴리즈 준비

- [ ] T030 towncrier 단편 296.feat.md [artifact: changes/296.feat.md] [why: tests]
- [ ] T031 towncrier 단편 304.feat.md [artifact: changes/304.feat.md] [why: tests]
- [ ] T032 quickstart Evidence [artifact: specs/015-day-schema-redesign/quickstart.md] [why: tests]
