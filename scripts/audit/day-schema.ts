import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== v2.7.0 Day 스키마 재설계 데이터 감사 ===\n");

  // 1. startDate / endDate가 NULL인 Trip
  const tripsWithNullDate = await prisma.trip.count({
    where: { OR: [{ startDate: null }, { endDate: null }] },
  });
  const tripsTotal = await prisma.trip.count();
  console.log("1) startDate/endDate NULL인 Trip:");
  console.log(`   ${tripsWithNullDate} / ${tripsTotal}건`);
  if (tripsWithNullDate > 0) {
    const samples = await prisma.trip.findMany({
      where: { OR: [{ startDate: null }, { endDate: null }] },
      select: { id: true, title: true, startDate: true, endDate: true },
      take: 5,
    });
    console.log(`   샘플:`, JSON.stringify(samples, null, 2));
  }
  console.log();

  // 2. 동일 (tripId, date) Day가 2개 이상
  const dupDates = await prisma.$queryRaw<
    Array<{ trip_id: number; date: Date; cnt: bigint }>
  >`
    SELECT trip_id, date, COUNT(*) AS cnt
    FROM days
    GROUP BY trip_id, date
    HAVING COUNT(*) > 1
    ORDER BY trip_id, date
    LIMIT 20
  `;
  console.log("2) 동일 (tripId, date) Day 2개 이상:");
  console.log(`   ${dupDates.length}건 (상위 20)`);
  if (dupDates.length > 0) {
    console.log(
      `   샘플:`,
      dupDates.map((d) => ({
        tripId: d.trip_id,
        date: d.date.toISOString().split("T")[0],
        count: Number(d.cnt),
      })),
    );
  }
  console.log();

  // 3. Trip 범위 밖 Day
  const outOfRange = await prisma.$queryRaw<
    Array<{
      day_id: number;
      trip_id: number;
      date: Date;
      start_date: Date | null;
      end_date: Date | null;
    }>
  >`
    SELECT d.id AS day_id, d.trip_id, d.date, t.start_date, t.end_date
    FROM days d
    JOIN trips t ON d.trip_id = t.id
    WHERE (t.start_date IS NOT NULL AND d.date < t.start_date)
       OR (t.end_date IS NOT NULL AND d.date > t.end_date)
    ORDER BY d.trip_id, d.date
    LIMIT 20
  `;
  const daysTotal = await prisma.day.count();
  console.log("3) Trip 범위 밖 Day:");
  console.log(`   ${outOfRange.length}건 (상위 20) / 전체 Day ${daysTotal}건`);
  if (outOfRange.length > 0) {
    console.log(
      `   샘플:`,
      outOfRange.map((r) => ({
        dayId: r.day_id,
        tripId: r.trip_id,
        date: r.date.toISOString().split("T")[0],
        range: `${r.start_date?.toISOString().split("T")[0] ?? "null"} ~ ${r.end_date?.toISOString().split("T")[0] ?? "null"}`,
      })),
    );
  }
  console.log();

  // 보너스: Day가 있는 Trip 분포
  const dayDist = await prisma.$queryRaw<Array<{ cnt: bigint; freq: bigint }>>`
    SELECT cnt, COUNT(*) AS freq
    FROM (SELECT trip_id, COUNT(*) AS cnt FROM days GROUP BY trip_id) sub
    GROUP BY cnt
    ORDER BY cnt
  `;
  console.log("보너스) Trip별 Day 개수 분포:");
  console.log(
    "  ",
    dayDist.map((d) => `${Number(d.cnt)}일×${Number(d.freq)}trip`).join(", "),
  );
}

main()
  .catch((e) => {
    console.error("ERROR:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
