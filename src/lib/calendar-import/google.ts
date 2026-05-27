/**
 * spec 027 — Google Calendar import fetcher.
 *
 * 사용자 본인의 Google 계정에서 calendarList + events.list를 호출한다.
 * trip-planner가 만든 캘린더는 결과에서 제외한다(GCalLink·TripCalendarLink로 식별).
 * push 경로(spec 024 googleProvider)와는 인스턴스 분리 — read-only.
 */

import { calendar_v3 } from "@googleapis/calendar";
import { prisma } from "@/lib/prisma";
import { getCalendarClient } from "@/lib/gcal/client";
import type {
  DateRange,
  ExternalCalendarFetcher,
  ExternalCalendarRef,
  ExternalEvent,
} from "./types";

const EVENTS_PAGE_SIZE = 250;
const MAX_EVENTS_PER_IMPORT = 500;

async function loadManagedCalendarIds(userId: string): Promise<Set<string>> {
  // 사용자 본인이 만든·소유한 trip 캘린더만 제외. 다른 사용자 trip의 공유 캘린더 ID는
  // 본인 Google calendarList에 노출되지 않으므로 일반적으로 영향 없으나, 식별자 우연 충돌
  // 방지를 위해 ownerId 필터를 명시한다.
  const [gcalLinks, sharedLinks] = await Promise.all([
    prisma.gCalLink.findMany({
      where: { userId, provider: "GOOGLE" },
      select: { calendarId: true },
    }),
    prisma.tripCalendarLink.findMany({
      where: { provider: "GOOGLE", ownerId: userId },
      select: { calendarId: true },
    }),
  ]);
  return new Set<string>([
    ...gcalLinks.map((l) => l.calendarId),
    ...sharedLinks.map((l) => l.calendarId),
  ]);
}

function parseDate(
  raw: calendar_v3.Schema$EventDateTime | undefined,
): { date: Date | null; isAllDay: boolean; timezone: string | null } {
  if (!raw) return { date: null, isAllDay: false, timezone: null };
  if (raw.dateTime) {
    return {
      date: new Date(raw.dateTime),
      isAllDay: false,
      timezone: raw.timeZone ?? null,
    };
  }
  if (raw.date) {
    return {
      date: new Date(`${raw.date}T00:00:00Z`),
      isAllDay: true,
      timezone: raw.timeZone ?? null,
    };
  }
  return { date: null, isAllDay: false, timezone: null };
}

function toExternalEvent(ev: calendar_v3.Schema$Event): ExternalEvent | null {
  if (!ev.id) return null;
  const startInfo = parseDate(ev.start);
  const endInfo = parseDate(ev.end);
  if (!startInfo.date || !endInfo.date) return null;
  return {
    externalEventId: ev.id,
    title: ev.summary ?? "(제목 없음)",
    startTime: startInfo.date,
    endTime: endInfo.date,
    isAllDay: startInfo.isAllDay,
    locationText: ev.location ?? null,
    description: ev.description ?? null,
    startTimezone: startInfo.timezone,
    endTimezone: endInfo.timezone,
  };
}

export const googleImportFetcher: ExternalCalendarFetcher = {
  provider: "GOOGLE",

  async isConnected(userId: string): Promise<boolean> {
    const client = await getCalendarClient(userId);
    return client !== null;
  },

  async listCalendars(userId: string): Promise<ExternalCalendarRef[]> {
    const client = await getCalendarClient(userId);
    if (!client) return [];
    const managed = await loadManagedCalendarIds(userId);
    const res = await client.calendar.calendarList.list({
      maxResults: 250,
      showHidden: false,
    });
    const items = res.data.items ?? [];
    return items
      .filter((c) => Boolean(c.id))
      .map((c) => {
        const calendarId = c.id as string;
        return {
          provider: "GOOGLE" as const,
          externalCalendarId: calendarId,
          displayName: c.summaryOverride ?? c.summary ?? null,
          accountLabel: null,
          isManagedByTripPlanner: managed.has(calendarId),
        };
      });
  },

  async listEvents(
    userId: string,
    externalCalendarId: string,
    range: DateRange,
  ): Promise<ExternalEvent[]> {
    const client = await getCalendarClient(userId);
    if (!client) return [];
    const events: ExternalEvent[] = [];
    let pageToken: string | undefined;
    do {
      const res = await client.calendar.events.list({
        calendarId: externalCalendarId,
        timeMin: range.start.toISOString(),
        timeMax: range.end.toISOString(),
        singleEvents: true, // 반복 일정 인스턴스 전개
        maxResults: EVENTS_PAGE_SIZE,
        pageToken,
      });
      const items = res.data.items ?? [];
      for (const ev of items) {
        const mapped = toExternalEvent(ev);
        if (mapped) events.push(mapped);
        if (events.length >= MAX_EVENTS_PER_IMPORT) break;
      }
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken && events.length < MAX_EVENTS_PER_IMPORT);
    return events;
  },
};
