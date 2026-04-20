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

/** Day POST/PUT 시 Trip 범위 자동 확장 + 영향받은 Day들의 sortOrder 재계산. */
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
    await recomputeAllDayNumbers(tx, tripId, updatedStart);
  }

  return {
    trip: { id: tripId, startDate: updatedStart, endDate: updatedEnd },
    expanded,
  };
}

/**
 * Trip.startDate 기준으로 그 Trip의 모든 Day.sortOrder를 dayNumber 값으로 동기화.
 * sortOrder 컬럼은 v1 호환을 위해 유지되며 dayNumber와 동일 값을 갖는다.
 */
export async function recomputeAllDayNumbers(
  tx: Prisma.TransactionClient,
  tripId: number,
  tripStartDate: Date,
): Promise<void> {
  const days = await tx.day.findMany({
    where: { tripId },
    select: { id: true, date: true },
  });
  await Promise.all(
    days.map((day) =>
      tx.day.update({
        where: { id: day.id },
        data: { sortOrder: computeDayNumber(day.date, tripStartDate) },
      }),
    ),
  );
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
