/**
 * spec 035 (#633) — 일정 동기화·보정의 타임존 선택 정본 목록.
 *
 * 여러 화면에 하드코딩돼 한쪽만 보강하면 어긋나던 것을 한 곳으로 모은다.
 * 여행 흔한 타임존을 담되 과하게 늘리지 않는다. 헌법 VII(부동 시간): 타임존은
 * 표시 시각을 바꾸지 않는 라벨이며, 외부 캘린더 연동 환산에만 쓰인다.
 */
export const TIMEZONE_OPTIONS = [
  "Asia/Seoul",
  "Asia/Tokyo",
  "Asia/Taipei",
  "Asia/Singapore",
  "Asia/Bangkok",
  "Europe/Lisbon",
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/Rome",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
] as const;
