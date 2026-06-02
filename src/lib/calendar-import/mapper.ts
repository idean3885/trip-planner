/**
 * spec 027 — 외부 이벤트 → ActivityDraft 매핑.
 *
 * 매핑 가능 필드(title, startTime, endTime, isAllDay, locationText, description, timezone)만
 * 옮긴다. activity category, hotel·attraction 참조, reservation status는 사용자가 승격 단계에서 입력.
 */

import type { CalendarProviderId, Prisma } from "@prisma/client";

import type { ExternalEvent } from "./types";

export interface MapToDraftInput {
  tripId: number;
  provider: CalendarProviderId;
  externalCalendarId: string;
  importRunId: number;
  event: ExternalEvent;
}

/** 외부 이벤트 1건을 ActivityDraft create input으로 변환. */
export function mapExternalEvent(
  input: MapToDraftInput,
): Prisma.ActivityDraftUncheckedCreateInput {
  const { event } = input;
  return {
    tripId: input.tripId,
    provider: input.provider,
    externalCalendarId: input.externalCalendarId,
    externalEventId: event.externalEventId,
    title: event.title,
    startTime: event.startTime,
    endTime: event.endTime,
    isAllDay: event.isAllDay,
    locationText: event.locationText,
    description: event.description,
    startTimezone: event.startTimezone,
    endTimezone: event.endTimezone,
    importRunId: input.importRunId,
  };
}

/** 외부 이벤트가 trip 기간(닫힌 구간)과 겹치는지 판정. */
export function overlapsTrip(
  event: ExternalEvent,
  trip: { startDate: Date; endDate: Date },
): boolean {
  return event.endTime >= trip.startDate && event.startTime <= trip.endDate;
}
