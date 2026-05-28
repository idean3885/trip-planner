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

export interface ResolvedPeriod {
  startDate: Date;
  endDate: Date;
  /** true면 derived 값, false면 fallback(명목) 값. */
  isDerived: boolean;
}

/**
 * v2.18.0 migrate — derived 우선, 일정 0건이면 명목 fallback 반환.
 *
 * 호출자는 trip 쿼리 시 fallback으로 쓸 명목 startDate/endDate를 함께 select해
 * 본 함수에 전달한다. v3.0.0(contract)에서 명목 컬럼이 DROP될 때 fallback 인자
 * 제거 + 반환 타입을 `DerivedPeriod` (null 가능)로 좁힌다.
 */
export async function getResolvedPeriod(
  tripId: number,
  fallback: { startDate: Date; endDate: Date },
): Promise<ResolvedPeriod> {
  const derived = await getDerivedPeriod(tripId);
  if (derived.startDate && derived.endDate) {
    return {
      startDate: derived.startDate,
      endDate: derived.endDate,
      isDerived: true,
    };
  }
  return { startDate: fallback.startDate, endDate: fallback.endDate, isDerived: false };
}
