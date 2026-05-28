/**
 * dayNumber 계산 헬퍼.
 *
 * Trip 의 시작일은 v3.0.0 (spec 029 contract) 이후 derived 값
 * (`getDerivedPeriod`)에서 계산한다. 본 모듈은 도메인 계산만 담당하고
 * Trip 의 어떤 컬럼도 참조하지 않는다.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * UTC 자정 기준 날짜만 비교하는 epoch 일수 변환.
 * Day.date 는 Timestamptz 로 저장돼 시간 성분을 가질 수 있으나, 본 도메인에서
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

/** Day 응답 객체에 sortOrder 필드 부착 (v1 응답, dayNumber 와 동일 값). */
export function withSortOrder<T extends { date: Date | string }>(
  day: T,
  tripStartDate: Date | string,
): T & { sortOrder: number } {
  const date = day.date instanceof Date ? day.date : new Date(day.date);
  const start =
    tripStartDate instanceof Date ? tripStartDate : new Date(tripStartDate);
  return { ...day, sortOrder: computeDayNumber(date, start) };
}
