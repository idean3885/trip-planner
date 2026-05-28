/**
 * spec 029 v2.17.0 expand — 여행 기간 derived 계산 헬퍼.
 *
 * Trip의 시작·종료 날짜를 명목 입력 컬럼이 아니라 등록된 Day들의 min/max
 * 날짜에서 동적으로 계산한다. 일정이 0건이면 둘 다 null. v2.18.0(migrate)에서
 * 모든 호출처가 본 헬퍼를 사용하도록 전환되고, v3.0.0(contract)에서 명목
 * 컬럼이 DROP된다.
 */

import { prisma } from "@/lib/prisma";

export interface DerivedPeriod {
  startDate: Date | null;
  endDate: Date | null;
}

/**
 * Trip에 등록된 일정의 min·max 날짜로 derived 기간을 계산한다.
 * 일정 0건이면 `{ startDate: null, endDate: null }` 반환.
 */
export async function getDerivedPeriod(tripId: number): Promise<DerivedPeriod> {
  const result = await prisma.day.aggregate({
    where: { tripId },
    _min: { date: true },
    _max: { date: true },
  });
  return {
    startDate: result._min.date ?? null,
    endDate: result._max.date ?? null,
  };
}
