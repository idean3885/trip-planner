# Implementation Plan: Day 스키마 재설계 + API v2 신설 (v2.7.0)

**Branch**: `015-day-schema-redesign` | **Date**: 2026-04-20 | **Spec**: ./spec.md

## Summary

`Day.sortOrder`(파생 가능 정수)를 DB 정합성 책임에서 떼어내고, `dayNumber = (date - trip.startDate) + 1`로 파생하는 자연키 모델로 전환. 동시에 `/api/v2/trips/...`를 신설해 신규 응답을 명확화하고, 기존 `/api/trips/...`(v1)는 sortOrder 응답을 유지(MCP 호환). expand-and-contract 패턴의 expand+migrate+v2 신설+UI 전환까지 본 피처에서 수행, contract(sortOrder DROP)는 #317 별도 트래킹.

## Coverage Targets

- 스키마 expand: dayNumber 응답 필드 + Trip.startDate NOT NULL + Day @@unique([tripId, date]) [why: schema-expand] [multi-step: 2]
- v1 어댑터 (sortOrder 응답 유지) [why: v1-adapter]
- v2 API 신설 (dayNumber 중심) [why: v2-api] [multi-step: 2]
- 웹 UI v2 전환 + 표시 로직 dayNumber 사용 [why: ui-migration]
- Trip 범위 자동 확장 (Day POST 시) [why: range-autoexpand]
- 테스트 (v1 호환 + v2 신규 + 자동 확장) [why: tests] [multi-step: 3]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+
**Primary Dependencies**: Next.js 16 (App Router), Prisma 7.x (@prisma/adapter-pg TCP)
**Storage**: Neon Postgres (공유 DB, dev/prod 동일 인스턴스)
**Testing**: Vitest (단위/통합), 기존 `tests/api/days-*.test.ts` 패턴
**Target Platform**: Vercel (sin1 region)
**Constraints**: 무중단(expand-and-contract), MCP 호환 (v1 응답 스키마 무변경)
**Scale**: 현재 Trip 1건 / Day 15건 (개발자 본인 데이터)

## Constitution Check

- 데이터 정본은 DB 그대로
- `prisma migrate deploy`만 사용 (CLAUDE.md "DB 마이그레이션" 규약 준수)
- speckit 메타태그 4종 부착

## Project Structure

```
specs/015-day-schema-redesign/
├── spec.md
├── plan.md          # this file
├── tasks.md
└── quickstart.md

prisma/
├── schema.prisma                                              # Trip.startDate NOT NULL + Day @@unique
└── migrations/20260420??????_v270_expand_day_constraints/migration.sql

src/app/api/
├── trips/[id]/days/route.ts                                   # v1 어댑터 (sortOrder 응답 매핑)
├── trips/[id]/days/[dayId]/route.ts                           # 동일
├── v2/
│   ├── trips/[id]/days/route.ts                               # v2 신설
│   └── trips/[id]/days/[dayId]/route.ts                       # 동일
├── trips/[id]/days/[dayId]/activities/route.ts                # 변화 없음
└── v2/trips/[id]/days/[dayId]/activities/route.ts             # 신설 (또는 v1 위임)

src/lib/
├── day-number.ts        # 신규: dayNumber 계산 + Trip 범위 자동 확장 헬퍼
└── day-order.ts         # 변경: v1 어댑터에서만 사용. 추후 #317에서 제거

src/app/trips/[id]/page.tsx, day/[dayId]/page.tsx              # /api/v2 호출로 전환

mcp/trip_mcp/planner.py                                         # 변경 없음 (v1 사용 유지)

changes/296.feat.md, 304.feat.md                                # towncrier 단편
```

## Migration Strategy

| 단계 | 작업 | migration-type |
|---|---|---|
| schema-only | Trip.startDate NOT NULL + Day @@unique([tripId, date]) | schema-only |

`dayNumber`는 컬럼이 아니라 응답 필드 파생 → 별도 backfill 마이그레이션 불필요. 기존 sortOrder 컬럼은 유지 (contract는 #317).

## Risks

- **NOT NULL 제약 추가 시 기존 NULL 데이터** → 감사 결과 0건, 안전
- **공유 DB이므로 마이그레이션 실패 시 prod 직격** → migration 파일은 작고 idempotent. dry-run 불가하므로 PR 리뷰 + 롤백 SQL 준비
- **동일 date Day 중복 제약** → 감사 결과 0건. 신규 충돌 시 API에서 자동 확장 정책으로 흡수

## Rollback

- 마이그레이션 실패 시: `ALTER TABLE trips ALTER COLUMN start_date DROP NOT NULL` + `ALTER TABLE days DROP CONSTRAINT IF EXISTS days_trip_id_date_key`
- 코드 롤백: 이전 배포로 Vercel rollback (sortOrder 컬럼은 그대로 유지되므로 코드만 되돌리면 즉시 정상화)
