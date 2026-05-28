/**
 * spec 029 T050A — Trip.startDate/endDate 컬럼 DROP 직전 데이터 보정 검증.
 *
 * 모든 trip 을 도는 dry-run 리포트. 다음 항목을 출력한다:
 *
 *  - total trips
 *  - days >= 1 trips (derived 정합 — DROP 안전)
 *  - days = 0 trips (derived 없음 — 응답 startDate/endDate 가 null 로 노출됨)
 *  - 명목 컬럼 != derived 인 trip (정합 균열, 조사 필요)
 *
 * 사고 시 rollback 절차:
 *   1. DB 백업 복원
 *   2. prisma/schema.prisma 의 startDate/endDate 필드 복원
 *   3. migration `<ts>-trip-period-contract/migration.sql` 의 역방향 SQL
 *      적용 (ADD COLUMN + day min/max 값 backfill)
 *   4. 코드 청소 PR 의 revert
 *
 * 실행: `tsx scripts/verify-trip-period-contract-readiness.ts`
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface TripRow {
  id: number;
  title: string;
  start_date: Date;
  end_date: Date;
  day_count: bigint;
}

interface PeriodRow {
  trip_id: number;
  min_date: Date | null;
  max_date: Date | null;
}

async function main() {
  // T050 migration 적용 전(start_date/end_date 컬럼이 살아 있을 때) 실행을
  // 전제로 raw SQL 로 컬럼을 직접 조회한다. Prisma 클라이언트는 T051 이후
  // 컬럼을 모르므로 raw 가 안전. 단, post-DROP 환경에서 실수로 재실행되면
  // raw SQL 자체가 실패해 부정확한 리포트를 낼 수 있어 컬럼 존재를 먼저
  // information_schema 로 확인하고 없으면 즉시 안내 + exit 1.
  const cols = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name IN ('start_date', 'end_date')
  `;
  if (cols.length < 2) {
    console.error(
      "ERROR: trips.start_date / end_date 컬럼이 이미 제거됐습니다. 본 스크립트는 T050 migration 적용 전에 실행해야 합니다.",
    );
    process.exit(1);
  }

  const trips = await prisma.$queryRaw<TripRow[]>`
    SELECT t.id, t.title, t.start_date, t.end_date,
           (SELECT COUNT(*) FROM days d WHERE d.trip_id = t.id) AS day_count
    FROM trips t
  `;

  const periods = await prisma.$queryRaw<PeriodRow[]>`
    SELECT trip_id, MIN(date) AS min_date, MAX(date) AS max_date
    FROM days
    GROUP BY trip_id
  `;
  const periodByTripId = new Map(
    periods.map((p) => [p.trip_id, { min: p.min_date, max: p.max_date }]),
  );

  let withDays = 0;
  let emptyDays = 0;
  const mismatches: {
    id: number;
    title: string;
    nominalStart: string;
    nominalEnd: string;
    derivedMin: string | null;
    derivedMax: string | null;
  }[] = [];

  for (const t of trips) {
    if (Number(t.day_count) === 0) {
      emptyDays += 1;
      continue;
    }
    withDays += 1;
    const p = periodByTripId.get(t.id);
    if (!p?.min || !p?.max) continue;
    const nominalStart = t.start_date.toISOString().slice(0, 10);
    const nominalEnd = t.end_date.toISOString().slice(0, 10);
    const derivedMin = p.min.toISOString().slice(0, 10);
    const derivedMax = p.max.toISOString().slice(0, 10);
    if (nominalStart !== derivedMin || nominalEnd !== derivedMax) {
      mismatches.push({
        id: t.id,
        title: t.title,
        nominalStart,
        nominalEnd,
        derivedMin,
        derivedMax,
      });
    }
  }

  console.log("=== Trip period contract readiness ===");
  console.log(`total trips: ${trips.length}`);
  console.log(`  with days (derived OK):  ${withDays}`);
  console.log(`  empty days (null start/end after DROP): ${emptyDays}`);
  console.log(`  nominal != derived (review): ${mismatches.length}`);
  if (mismatches.length > 0) {
    console.log("\n--- mismatches (id · title · nominal · derived) ---");
    for (const m of mismatches) {
      console.log(
        `  ${m.id}  ${m.title}  nominal=${m.nominalStart}~${m.nominalEnd}  derived=${m.derivedMin}~${m.derivedMax}`,
      );
    }
  }

  console.log("\n안전 판단 기준:");
  console.log("  - mismatches.length == 0 면 derived 가 명목과 일치 — DROP 안전");
  console.log("  - mismatches > 0 면 명목이 stale 한 trip — derived 정본 정책상 OK");
  console.log("  - empty days > 0 면 응답 startDate/endDate 가 null 노출 — UI 확인 필요");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
