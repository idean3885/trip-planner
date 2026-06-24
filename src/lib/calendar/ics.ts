/**
 * spec 025 (#417) — Activity ↔ ICS VEVENT 변환.
 *
 * RFC 5545 minimal VEVENT 형식. CalDAV(Apple iCloud)와 Google Calendar import 양쪽에서
 * 동작. 본 모듈은 provider 인터페이스의 `putEvent/updateEvent`가 받는 `ics: string`의
 * 표준 생성 지점이다.
 *
 * 라인 길이 75 octet 제한(RFC 5545 §3.1)은 짧은 활동에선 거의 발생 안 하므로 본 회차는
 * 단순 변환만 — 75자 초과 시에도 대부분 클라이언트가 관대하게 처리. 엄격 fold가 필요한
 * 케이스(아주 긴 description)가 보고되면 후속 회차에서 fold 알고리즘 추가.
 */

import { randomUUID } from "node:crypto";

import type { Activity, Trip } from "@prisma/client";

const PRODID = "-//trip-planner//EN";

const CATEGORY_SYMBOL: Record<string, string> = {
  SIGHTSEEING: "🗺️",
  DINING: "🍽️",
  TRANSPORT: "✈️",
  ACCOMMODATION: "🏨",
  SHOPPING: "🛍️",
  OTHER: "•",
};

export type ActivityForIcs = Pick<
  Activity,
  | "title"
  | "category"
  | "startTime"
  | "startTimezone"
  | "endTime"
  | "endTimezone"
  | "location"
  | "memo"
  | "allDay"
>;

export interface IcsContext {
  tripUrl: string;
  /** 명시적 UID. 없으면 randomUUID. update 시 기존 UID 재사용해야 함. */
  uid?: string;
}

/** ICS 텍스트의 특수 문자 escape — `,`, `;`, `\`, `\n`. */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Date → `YYYYMMDDTHHMMSSZ` UTC 표기. */
function formatUtcStamp(d: Date): string {
  const iso = d.toISOString().replace(/[-:]/g, "");
  // ISO: 2026-04-27T14:30:00.000Z → 20260427T143000.000Z → 20260427T143000Z
  return iso.replace(/\.\d{3}/, "");
}

/** Date → `YYYYMMDD` UTC 날짜 표기 (종일 이벤트 VALUE=DATE 용). */
function formatDateStamp(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

/** Date → tzid local 시각 표기 `YYYYMMDDTHHMMSS` (TZID 별도 attribute). */
function formatLocalStamp(d: Date, tz: string): string {
  // Intl.DateTimeFormat를 사용해 tz 기준 컴포넌트 추출
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const y = get("year");
  const m = get("month");
  const day = get("day");
  let h = get("hour");
  if (h === "24") h = "00"; // Intl 일부 환경에서 24:xx 표기
  const min = get("minute");
  const sec = get("second");
  return `${y}${m}${day}T${h}${min}${sec}`;
}

/** Activity 1건을 RFC 5545 VEVENT 블록을 포함한 VCALENDAR ICS 문자열로 변환. */
export function formatActivityAsIcs(
  activity: ActivityForIcs,
  trip: Pick<Trip, "id" | "title">,
  ctx: IcsContext,
): string {
  const symbol = CATEGORY_SYMBOL[activity.category] ?? "•";
  const summary = `[${trip.title}] ${symbol} ${activity.title}`;

  const descLines: string[] = [];
  if (activity.memo) descLines.push(activity.memo);
  if (activity.location) {
    descLines.push(`📍 ${activity.location}`);
    descLines.push(
      `지도: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location)}`,
    );
  }
  descLines.push("");
  descLines.push(`여행 상세: ${ctx.tripUrl}`);

  const start = activity.startTime ?? new Date();
  const end = activity.endTime ?? activity.startTime ?? new Date();
  const startZone = activity.startTimezone || "UTC";
  const endZone = activity.endTimezone || activity.startTimezone || "UTC";

  let dtstart: string;
  let dtend: string;
  if (activity.allDay) {
    // #740 — RFC 5545 종일 이벤트: DATE 값. DTEND 는 배타적이라 다음 날로 둔다.
    const next = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    dtstart = `DTSTART;VALUE=DATE:${formatDateStamp(start)}`;
    dtend = `DTEND;VALUE=DATE:${formatDateStamp(next)}`;
  } else {
    dtstart =
      startZone === "UTC"
        ? `DTSTART:${formatUtcStamp(start)}`
        : `DTSTART;TZID=${startZone}:${formatLocalStamp(start, startZone)}`;
    dtend =
      endZone === "UTC"
        ? `DTEND:${formatUtcStamp(end)}`
        : `DTEND;TZID=${endZone}:${formatLocalStamp(end, endZone)}`;
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "BEGIN:VEVENT",
    `UID:${ctx.uid ?? randomUUID()}`,
    `DTSTAMP:${formatUtcStamp(new Date())}`,
    dtstart,
    dtend,
    `SUMMARY:${escapeText(summary)}`,
  ];
  if (activity.location) {
    lines.push(`LOCATION:${escapeText(activity.location)}`);
  }
  lines.push(`DESCRIPTION:${escapeText(descLines.join("\n"))}`);
  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

/** ICS 문자열에서 UID를 추출 (update 시 기존 UID 재사용용). 못 찾으면 null. */
export function extractIcsUid(ics: string): string | null {
  const m = ics.match(/^UID:(.+)$/m);
  return m ? m[1].trim() : null;
}
