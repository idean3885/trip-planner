/**
 * spec 027 US2 — ActivityDraft → 정식 Activity 승격.
 *
 * 필수 입력: activity category, reservation status, start/end timezone (IANA).
 * draft.dayId 가 있으면 그대로, 없으면 startTime의 일자에 매칭되는 Day를 찾는다.
 * 매칭되는 Day가 trip에 없으면 신규 생성(spec 010 day expansion 정책 호환).
 */

import type {
  ActivityCategory,
  Prisma,
  ReservationStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface PromoteInput {
  draftId: number;
  tripId: number;
  category: ActivityCategory;
  reservationStatus: ReservationStatus;
  startTimezone: string;
  endTimezone: string;
  location?: string | null;
}

export class DraftNotPromotableError extends Error {
  constructor(message: string) {
    super(message);
  }
}

function startOfUtcDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export async function promoteDraft(input: PromoteInput): Promise<{ activityId: number }> {
  const draft = await prisma.activityDraft.findFirst({
    where: { id: input.draftId, tripId: input.tripId },
  });
  if (!draft) throw new DraftNotPromotableError("draft_not_found");
  if (draft.status !== "PENDING") {
    throw new DraftNotPromotableError("draft_not_pending");
  }

  const trip = await prisma.trip.findUnique({
    where: { id: input.tripId },
    select: { startDate: true, endDate: true },
  });
  if (!trip) throw new DraftNotPromotableError("trip_not_found");

  // Day 매칭/생성
  const dayDate = startOfUtcDay(draft.startTime);
  let dayId = draft.dayId;
  if (!dayId) {
    const existing = await prisma.day.findUnique({
      where: { tripId_date: { tripId: input.tripId, date: dayDate } },
      select: { id: true },
    });
    if (existing) {
      dayId = existing.id;
    } else {
      const created = await prisma.day.create({
        data: { tripId: input.tripId, date: dayDate },
        select: { id: true },
      });
      dayId = created.id;
    }
  }

  const finalDayId = dayId;

  return prisma.$transaction(async (tx) => {
    const activity = await tx.activity.create({
      data: {
        dayId: finalDayId,
        category: input.category,
        title: draft.title,
        startTime: draft.startTime,
        startTimezone: input.startTimezone,
        endTime: draft.endTime,
        endTimezone: input.endTimezone,
        location: input.location ?? draft.locationText,
        memo: draft.description,
        reservationStatus: input.reservationStatus,
      } satisfies Prisma.ActivityUncheckedCreateInput,
    });
    await tx.activityDraft.update({
      where: { id: draft.id },
      data: {
        status: "PROMOTED",
        promotedToActivityId: activity.id,
        dayId: finalDayId,
      },
    });
    return { activityId: activity.id };
  });
}
