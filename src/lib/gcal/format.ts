/**
 * Activity → Google Calendar Event 변환.
 *
 * 제목: `[여행명] 카테고리기호 활동제목` (스펙 FR-013)
 * 설명: 예약 상태, 메모, 위치 지도 링크, 원본 여행 페이지 링크
 * 시각: Activity.startTime/endTime(UTC) + startTimezone/endTimezone(IANA).
 *       시간대가 없으면 UTC로 폴백 (#232/#325에 의해 정상 Activity에는 IANA가 설정됨).
 */

import type { Activity, Trip } from "@prisma/client";
import { DEDICATED_CALENDAR_SUFFIX } from "@/types/gcal";

const CATEGORY_SYMBOL: Record<string, string> = {
  SIGHTSEEING: "🗺️",
  DINING: "🍽️",
  TRANSPORT: "✈️",
  ACCOMMODATION: "🏨",
  SHOPPING: "🛍️",
  OTHER: "•",
};

const RESERVATION_LABEL: Record<string, string> = {
  REQUIRED: "사전 예약 필수",
  RECOMMENDED: "사전 예약 권장",
  ON_SITE: "현장 구매",
  NOT_NEEDED: "예약 불필요",
  RESERVED: "예약 완료",
};

export interface FormattedEvent {
  summary: string;
  description: string;
  /**
   * Google Calendar API events.insert/patch는 location 필드에 null이 들어오면
   * "Invalid value at 'event.location'" 400을 응답한다. 값이 없을 때는 키 자체를
   * 보내지 않도록 optional로 둔다 (#481).
   */
  location?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

export type ActivityForFormat = Pick<
  Activity,
  | "title"
  | "category"
  | "startTime"
  | "startTimezone"
  | "endTime"
  | "endTimezone"
  | "location"
  | "memo"
  | "reservationStatus"
>;

export function formatActivityAsEvent(
  activity: ActivityForFormat,
  trip: Pick<Trip, "id" | "title">,
  opts: { tripUrl: string }
): FormattedEvent {
  const symbol = CATEGORY_SYMBOL[activity.category] ?? "•";
  const summary = `[${trip.title}] ${symbol} ${activity.title}`;

  const descLines: string[] = [];
  if (activity.reservationStatus) {
    descLines.push(RESERVATION_LABEL[activity.reservationStatus] ?? activity.reservationStatus);
  }
  if (activity.memo) descLines.push(activity.memo);
  if (activity.location) {
    descLines.push(`📍 ${activity.location}`);
    descLines.push(
      `지도: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location)}`
    );
  }
  descLines.push("");
  descLines.push(`여행 상세: ${opts.tripUrl}`);

  // 시간이 없는 활동에도 안전하게 — 시작 없으면 UTC 00:00, 끝 없으면 시작과 동일
  const startDate = activity.startTime ?? new Date();
  // Google Calendar API는 end <= start (zero-duration·역순) 이벤트를 400으로 거부한다.
  // endTime이 없거나 startTime과 같거나 더 이르면 +1h 보정 (#481).
  const endCandidate = activity.endTime ?? activity.startTime ?? new Date();
  const endDate =
    endCandidate.getTime() <= startDate.getTime()
      ? new Date(startDate.getTime() + 60 * 60 * 1000)
      : endCandidate;
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();
  const startZone = activity.startTimezone || "UTC";
  const endZone = activity.endTimezone || activity.startTimezone || "UTC";

  const event: FormattedEvent = {
    summary,
    description: descLines.join("\n"),
    start: { dateTime: startIso, timeZone: startZone },
    end: { dateTime: endIso, timeZone: endZone },
  };
  if (activity.location) event.location = activity.location;
  return event;
}

export function dedicatedCalendarName(tripTitle: string): string {
  return `${tripTitle}${DEDICATED_CALENDAR_SUFFIX}`;
}
