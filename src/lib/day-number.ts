import type { Prisma } from "@prisma/client";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * UTC 자정 기준 날짜만 비교하는 epoch 일수 변환.
 * Day.date는 Timestamptz로 저장돼 시간 성분을 가질 수 있으나, 본 도메인에서
 * 날짜는 "달력일"을 의미하므로 UTC 자정 기준으로 정규화한다.
 */
function toUtcEpochDay(d: Date): number {
  return Math.floor(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / MS_PER_DAY,
  );
}

export function computeDayNumber(date: Date, tripStartDate: Date): number {
  return toUtcEpochDay(date) - toUtcEpochDay(tripStartDate) + 1;
}

/** Day POST/PUT 시 Trip 범위 자동 확장. */
export async function expandTripRangeIfNeeded(
  tx: Prisma.TransactionClient,
  tripId: number,
  newDate: Date,
): Promise<{ trip: { id: number; startDate: Date; endDate: Date }; expanded: boolean }> {
  const trip = await tx.trip.findUniqueOrThrow({
    where: { id: tripId },
    select: { id: true, startDate: true, endDate: true },
  });

  const targetEpoch = toUtcEpochDay(newDate);
  const startEpoch = toUtcEpochDay(trip.startDate);
  const endEpoch = toUtcEpochDay(trip.endDate);

  let updatedStart = trip.startDate;
  let updatedEnd = trip.endDate;
  let expanded = false;

  if (targetEpoch < startEpoch) {
    updatedStart = newDate;
    expanded = true;
  }
  if (targetEpoch > endEpoch) {
    updatedEnd = newDate;
    expanded = true;
  }

  if (expanded) {
    await tx.trip.update({
      where: { id: tripId },
      data: { startDate: updatedStart, endDate: updatedEnd },
    });
  }

  return {
    trip: { id: tripId, startDate: updatedStart, endDate: updatedEnd },
    expanded,
  };
}

/** Day 응답 객체에 dayNumber 필드 부착 (v2 응답). */
export function withDayNumber<T extends { date: Date | string }>(
  day: T,
  tripStartDate: Date | string,
): T & { dayNumber: number } {
  const date = day.date instanceof Date ? day.date : new Date(day.date);
  const start =
    tripStartDate instanceof Date ? tripStartDate : new Date(tripStartDate);
  return { ...day, dayNumber: computeDayNumber(date, start) };
}

/** Day 응답 객체에 sortOrder 필드 부착 (v1 응답, dayNumber와 동일 값). */
export function withSortOrder<T extends { date: Date | string }>(
  day: T,
  tripStartDate: Date | string,
): T & { sortOrder: number } {
  const date = day.date instanceof Date ? day.date : new Date(day.date);
  const start =
    tripStartDate instanceof Date ? tripStartDate : new Date(tripStartDate);
  return { ...day, sortOrder: computeDayNumber(date, start) };
}
