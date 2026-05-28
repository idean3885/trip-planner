/**
 * spec 029 v2.17.0 expand 보정 검증 — 모든 trip의 명목 startDate/endDate가
 * derived 값과 정합한지 확인하는 일회성 스크립트.
 *
 * 차이가 있으면 콘솔에 리포트만 한다(데이터 자동 수정 안 함). 사람·운영자가
 * 결과를 보고 manual 보정 여부를 결정한다. v2.18.0(migrate) 전에 1회 실행.
 *
 * 사용:
 *   pnpm tsx scripts/verify-trip-period-alignment.ts
 */

import { prisma } from "@/lib/prisma";
import { getDerivedPeriod } from "@/lib/trip-period";

interface Mismatch {
  tripId: number;
  title: string;
  nominalStart: Date | null;
  nominalEnd: Date | null;
  derivedStart: Date | null;
  derivedEnd: Date | null;
}

async function main() {
  const trips = await prisma.trip.findMany({
    select: { id: true, title: true, startDate: true, endDate: true },
  });

  const mismatches: Mismatch[] = [];

  for (const trip of trips) {
    const derived = await getDerivedPeriod(trip.id);
    const startEqual = sameDay(trip.startDate, derived.startDate);
    const endEqual = sameDay(trip.endDate, derived.endDate);
    if (!startEqual || !endEqual) {
      mismatches.push({
        tripId: trip.id,
        title: trip.title,
        nominalStart: trip.startDate,
        nominalEnd: trip.endDate,
        derivedStart: derived.startDate,
        derivedEnd: derived.endDate,
      });
    }
  }

  console.log(`총 trip 수: ${trips.length}`);
  console.log(`명목·derived 불일치: ${mismatches.length}`);

  if (mismatches.length > 0) {
    console.log("\n--- 불일치 목록 ---");
    for (const m of mismatches) {
      console.log(
        `#${m.tripId} ${m.title}\n` +
          `  명목 : ${fmt(m.nominalStart)} ~ ${fmt(m.nominalEnd)}\n` +
          `  derived: ${fmt(m.derivedStart)} ~ ${fmt(m.derivedEnd)}`,
      );
    }
  }
}

function sameDay(a: Date | null, b: Date | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

function fmt(d: Date | null): string {
  return d === null ? "null" : d.toISOString().slice(0, 10);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
