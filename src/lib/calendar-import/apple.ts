/**
 * spec 027 — Apple CalDAV import fetcher.
 *
 * 사용자의 Apple iCloud 계정에서 CalDAV로 캘린더 목록·VEVENT를 fetch한다.
 * trip-planner가 만든 캘린더는 TripCalendarLink 매핑으로 식별해 제외.
 * push 경로(spec 025 appleProvider)와는 read-only 분리.
 */

import { prisma } from "@/lib/prisma";
import { createAppleClient } from "@/lib/calendar/provider/apple-client";
import { decryptPassword } from "@/lib/calendar/provider/apple-crypto";
import { parseVevent } from "./ics-parser";
import type {
  DateRange,
  ExternalCalendarFetcher,
  ExternalCalendarRef,
  ExternalEvent,
} from "./types";

async function loadClient(userId: string) {
  const cred = await prisma.appleCalendarCredential.findUnique({ where: { userId } });
  if (!cred) return null;
  try {
    const password = decryptPassword(cred.encryptedPassword, cred.iv);
    return createAppleClient({ appleId: cred.appleId, appPassword: password });
  } catch {
    return null;
  }
}

async function loadManagedCalendarUrls(userId: string): Promise<Set<string>> {
  const links = await prisma.tripCalendarLink.findMany({
    where: { provider: "APPLE", ownerId: userId },
    select: { calendarId: true },
  });
  return new Set(links.map((l) => l.calendarId));
}

export const appleImportFetcher: ExternalCalendarFetcher = {
  provider: "APPLE",

  async isConnected(userId: string): Promise<boolean> {
    const cred = await prisma.appleCalendarCredential.findUnique({ where: { userId } });
    return cred !== null;
  },

  async listCalendars(userId: string): Promise<ExternalCalendarRef[]> {
    const client = await loadClient(userId);
    if (!client) return [];
    const managed = await loadManagedCalendarUrls(userId);
    const calendars = await client.fetchCalendars();
    return calendars
      .filter(
        (c) =>
          Array.isArray(c.components) && c.components.includes("VEVENT") && Boolean(c.url),
      )
      .map((c) => ({
        provider: "APPLE" as const,
        externalCalendarId: c.url,
        displayName: typeof c.displayName === "string" ? c.displayName : null,
        accountLabel: null,
        isManagedByTripPlanner: managed.has(c.url),
      }));
  },

  async listEvents(
    userId: string,
    externalCalendarId: string,
    range: DateRange,
  ): Promise<ExternalEvent[]> {
    const client = await loadClient(userId);
    if (!client) return [];
    const calendars = await client.fetchCalendars();
    const target = calendars.find((c) => c.url === externalCalendarId);
    if (!target) return [];

    const objects = await client.fetchCalendarObjects({
      calendar: target,
      timeRange: {
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      },
      expand: true,
    });

    const events: ExternalEvent[] = [];
    for (const obj of objects) {
      const ics = obj.data;
      if (typeof ics !== "string") continue;
      const fallbackId = obj.url ?? undefined;
      const ev = parseVevent(ics, fallbackId);
      if (ev) events.push(ev);
    }
    return events;
  },
};
