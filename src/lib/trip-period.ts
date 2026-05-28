/**
 * spec 029 — 여행 기간 derived 계산 헬퍼.
 *
 * v3.0.0 contract 이후 Trip 은 startDate/endDate 컬럼이 없다. 시작·종료
 * 날짜는 등록된 Day 의 min/max 에서 derive 한다. 일정 0건이면 둘 다 null.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface DerivedPeriod {
  startDate: Date | null;
  endDate: Date | null;
}

/**
 * Trip 에 등록된 일정의 min·max 날짜로 derived 기간을 계산한다.
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

/** 트랜잭션 컨텍스트용 derived 기간 계산 (Day insert 직후 정합 조회). */
export async function getDerivedPeriodTx(
  tx: Prisma.TransactionClient,
  tripId: number,
): Promise<DerivedPeriod> {
  const result = await tx.day.aggregate({
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
  startDate: Date | null;
  endDate: Date | null;
  /** true 면 일정 ≥ 1 건 derived 값, false 면 일정 0 건 (둘 다 null). */
  isDerived: boolean;
}

/**
 * 응답 노출용 wrapper. v2.18.0 까지 명목 fallback 인자를 받았으나 v3.0.0
 * contract 에서 명목 컬럼이 제거돼 fallback 자체가 사라졌다. 일정 0 건
 * trip 은 startDate/endDate 가 null 로 노출되고 UI 는 "일정 미정" 으로 분기.
 */
export async function getResolvedPeriod(tripId: number): Promise<ResolvedPeriod> {
  const derived = await getDerivedPeriod(tripId);
  return {
    startDate: derived.startDate,
    endDate: derived.endDate,
    isDerived: derived.startDate !== null && derived.endDate !== null,
  };
}
