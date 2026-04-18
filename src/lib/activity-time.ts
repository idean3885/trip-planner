/**
 * Activity 시각 변환 유틸리티.
 *
 * HH:mm 입력은 `timezone`의 로컬 시각으로 해석하여 실제 UTC 시각(Timestamptz)으로
 * 변환한다. 이전 구현은 `setUTCHours`로 HH:mm을 그대로 저장해 "floating-time"이
 * 되었고 timezone 값을 무시했다(issue #232). 이 모듈은 그 문제를 수정한다.
 *
 * 사용 위치:
 *   - POST /api/trips/[id]/days/[dayId]/activities
 *   - PUT  /api/trips/[id]/days/[dayId]/activities/[activityId]
 *
 * 표시 측(프론트엔드)은 `Intl.DateTimeFormat`에 `timeZone`을 넘겨 렌더한다
 * (`ActivityCard.formatTime` 참조).
 */

/**
 * "YYYY-MM-DDTHH:mm:ss" 형태 로컬 시각 문자열을 IANA timezone 기준으로 해석해
 * UTC `Date`를 반환한다.
 *
 * 내부 전략: 후보 UTC `Date`를 두 번 `Intl.DateTimeFormat`로 포매팅해 실제 offset을
 * 구하고, 보정한다. 두 번의 적용으로 DST 경계 ±1시간 오차까지 수렴한다.
 */
function zonedWallTimeToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  timezone: string
): Date {
  // 1차: 벽시각을 UTC로 가정한 초기값
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  // 해당 Date가 timezone에서 표시되는 실제 벽시각을 구해서 offset을 계산
  const offsetMs = tzOffsetMs(guess, timezone);

  // 보정된 UTC
  const corrected = guess - offsetMs;

  // DST 경계에서 한 번 더 보정 (corrected 시점의 offset이 초기값과 다를 수 있음)
  const offsetMs2 = tzOffsetMs(corrected, timezone);
  if (offsetMs2 !== offsetMs) {
    return new Date(guess - offsetMs2);
  }
  return new Date(corrected);
}

/**
 * 주어진 UTC 밀리초에서 timezone이 UTC보다 얼마나 앞서는지(ms)를 반환한다.
 * 예: Asia/Seoul은 +32400000ms (+9시간).
 */
function tzOffsetMs(utcMs: number, timezone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return asUtc - utcMs;
}

/**
 * 입력 값(`value`)을 `Date` 또는 null/undefined로 변환한다.
 *
 * - `undefined`  → `undefined` (필드 미지정)
 * - `null` 또는 빈 문자열 → `null` (명시적 삭제)
 * - `T`를 포함한 full ISO 문자열 → `new Date(value)` (이미 절대 시각)
 * - `HH:mm` 형태 → `dayDate`의 날짜(UTC 기준 연/월/일) + HH:mm을 `timezone`의 벽시각으로 해석해 UTC `Date` 반환
 *   - `timezone`이 null/undefined면 `setUTCHours` fallback (과거 호환)
 *
 * `dayDate`는 Day.date (UTC 자정 기준 달력 날짜). 연/월/일은 UTC 값을 그대로 사용.
 */
export function toTimestamp(
  value: string | null | undefined,
  dayDate: Date,
  timezone: string | null | undefined
): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (value.includes("T")) return new Date(value);

  const match = value.match(/^(\d{2}):(\d{2})/);
  if (!match) return null;

  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const year = dayDate.getUTCFullYear();
  const month = dayDate.getUTCMonth() + 1;
  const day = dayDate.getUTCDate();

  if (!timezone) {
    // Fallback: UTC 기준으로 HH:mm을 그대로 사용 (과거 동작, floating-time 보존)
    const dt = new Date(dayDate);
    dt.setUTCHours(hour, minute, 0, 0);
    return dt;
  }

  return zonedWallTimeToUtc(year, month, day, hour, minute, timezone);
}
