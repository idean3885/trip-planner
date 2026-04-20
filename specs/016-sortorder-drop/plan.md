# Implementation Plan: Day.sortOrder 컬럼 DROP (v2.7.1 contract)

**Branch**: `016-sortorder-drop` | **Date**: 2026-04-20 | **Spec**: ./spec.md

## Summary

v2.7.0의 expand-and-contract 패턴 마지막 단계. `Day.sortOrder` 컬럼을 DB에서 제거하고, v1 어댑터가 `computeDayNumber()`로 응답에 sortOrder를 동적 생성. v1 응답 스키마 무변경 → MCP 호환 100%.

## Coverage Targets

- DB 스키마 contract — Day.sortOrder 컬럼 DROP [why: schema-contract] [multi-step: 2]
- v1 어댑터 동적 계산 — sortOrder 응답 키를 dayNumber로 생성 [why: v1-dynamic-sortorder] [multi-step: 2]
- 데드 코드 정리 — recomputeAllDayNumbers 제거 또는 NOOP [why: cleanup]
- 테스트 — v1 응답에 sortOrder 키 정수 검증 (DROP 후) [why: tests]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+
**Primary Dependencies**: Next.js 16, Prisma 7.x, @prisma/adapter-pg
**Storage**: 공유 Neon Postgres (#318로 분리 예정이지만 본 PR 기준 공유)
**Testing**: Vitest
**Constraints**: 무중단(contract 단계), MCP 호환 (v1 응답 스키마 무변경)

## Project Structure

```
specs/016-sortorder-drop/
├── spec.md
├── plan.md
├── tasks.md
└── quickstart.md

prisma/
├── schema.prisma                                                       # Day.sortOrder 라인 제거
└── migrations/20260420010000_v271_drop_day_sortorder/migration.sql

src/lib/
├── day-number.ts                                                       # recomputeAllDayNumbers NOOP화 또는 삭제
└── day-order.ts                                                        # 이미 사용 안 됨, 삭제

src/app/api/trips/[id]/                                                  # v1 어댑터
├── route.ts                                                            # 응답에 sortOrder 동적 부착 (Trip 상세 응답의 days)
├── days/route.ts                                                       # GET 응답에 sortOrder 동적 부착
└── days/[dayId]/route.ts                                               # GET/PUT 응답에 sortOrder 동적 부착, sortOrder 컬럼 쓰기 제거
```

## Migration Strategy

| 단계 | migration-type |
|---|---|
| schema-only — DROP COLUMN sort_order | schema-only |
| data-migration baseline (NOOP, audit 기록) | data-migration |

`dayNumber`가 date 파생이라 **데이터 손실 없음**. 컬럼 값(1..N)은 모두 (date - startDate + 1)로 정확히 복원 가능.

## Risks

- v1 어댑터에 sortOrder 부착 누락 → MCP 호환 깨짐. 모든 v1 GET 핸들러에 `withSortOrder()` 헬퍼 적용 + 회귀 테스트로 보장
- 컬럼 DROP 후 롤백 시 v2.6.x 코드는 컬럼 부재로 SELECT 실패 → 본 프로젝트는 단방향 진행, 필요 시 컬럼 재추가 + backfill SQL로 복구

## Rollback

```sql
-- 비상 복구 (v2.7.0 코드로 되돌릴 경우)
ALTER TABLE "days" ADD COLUMN "sort_order" INT NOT NULL DEFAULT 0;
UPDATE "days" d
SET sort_order = ((d.date::date - t.start_date::date) + 1)
FROM "trips" t WHERE d.trip_id = t.id;
```
