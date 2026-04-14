/**
 * 달력 날짜 표시 유틸리티
 *
 * 여행 일정 날짜(Day.date, Trip.startDate/endDate)는 "6월 7일"이라는 달력 날짜이다.
 * DB에 UTC 자정(00:00:00Z)으로 저장하고, 표시 시 UTC 기준으로 날짜를 추출한다.
 * 이렇게 하면 한국에서든 포르투갈에서든 같은 날짜가 표시된다.
 *
 * 감사 필드(createdAt, updatedAt 등)는 시점이므로 이 유틸 사용 불필요.
 */

/**
 * UTC 자정 기준으로 "M. D. (요일)" 형태를 반환한다.
 * 예: 2026-06-07T00:00:00Z → "6. 7. (일)"
 */
export function formatCalendarDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getUTCDay()];
  return `${month}. ${day}. (${weekday})`;
}

/**
 * UTC 자정 기준으로 "YYYY. M. D." 형태를 반환한다.
 * 예: 2026-06-07T00:00:00Z → "2026. 6. 7."
 */
export function formatCalendarDateFull(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${year}. ${month}. ${day}.`;
}

/**
 * UTC 자정 기준으로 "YYYY년 M월 D일 (요일)" 형태를 반환한다.
 */
export function formatCalendarDateLong(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getUTCDay()];
  return `${year}년 ${month}월 ${day}일 ${weekday}요일`;
}
