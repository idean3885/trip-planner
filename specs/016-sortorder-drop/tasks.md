# Tasks: Day.sortOrder 컬럼 DROP (v2.7.1)

## US1 - MCP 무중단 (P1)

- [ ] T001 v1 어댑터 — Trip 상세 GET 응답의 days에 sortOrder 동적 부착 [artifact: src/app/api/trips/<id>/route.ts] [why: v1-dynamic-sortorder]
- [ ] T002 v1 어댑터 — days GET 응답에 sortOrder 동적 부착 [artifact: src/app/api/trips/<id>/days/route.ts] [why: v1-dynamic-sortorder]
- [ ] T003 v1 어댑터 — day 상세 GET/PUT 응답에 sortOrder 동적 부착 [artifact: src/app/api/trips/<id>/days/<dayId>/route.ts] [why: v1-dynamic-sortorder]
- [ ] T004 v1 sortOrder 동적 부착 회귀 테스트 [artifact: tests/api/v1-sortorder-dynamic.test.ts] [why: tests]

## US2 - DB 정리 (P2)

- [ ] T010 Prisma 스키마 — Day.sortOrder 라인 제거 [artifact: prisma/schema.prisma] [why: schema-contract]
- [ ] T011 DROP COLUMN 마이그레이션 [artifact: prisma/migrations/20260420010000_v271_drop_day_sortorder/migration.sql] [why: schema-contract] [migration-type: schema-only]
- [ ] T011b 데이터 감사 베이스라인 마이그레이션 (NOOP) [artifact: prisma/migrations/20260420010001_v271_data_audit_baseline/migration.sql] [why: schema-contract] [migration-type: data-migration]

## 정리

- [ ] T020 day-number.ts — recomputeAllDayNumbers/expandTripRangeIfNeeded에서 sortOrder 갱신 코드 제거 [artifact: src/lib/day-number.ts] [why: cleanup]
- [ ] T021 day-order.ts 및 day-order.test.ts 삭제 (사용 안 됨) [artifact: src/lib/day-order.ts] [why: cleanup]

## 릴리즈 준비

- [ ] T030 towncrier 단편 [artifact: changes/317.fix.md] [why: tests]
- [ ] T031 quickstart Evidence [artifact: specs/016-sortorder-drop/quickstart.md] [why: tests]
