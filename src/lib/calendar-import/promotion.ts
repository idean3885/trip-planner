/**
 * spec 027 US2 — ActivityDraft → 정식 Activity 승격.
 *
 * 필수 입력: activity category, start/end timezone (IANA).
 * draft.dayId 가 있으면 그대로, 없으면 startTime의 일자에 매칭되는 Day를 찾는다.
 * 매칭되는 Day가 trip에 없으면 신규 생성(spec 010 day expansion 정책 호환).
 * 승격된 활동의 지출 시점(paymentTiming)은 스키마 기본값(현장)으로 두고, 이후
 * 일반 활동 편집에서 조절한다.
 */

import type { ActivityCategory, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export interface PromoteInput {
  draftId: number;
  tripId: number;
  category: ActivityCategory;
  startTimezone: string;
  endTimezone: string;
  location?: string | null;
  /**
   * spec 033 — 확정 전 클라이언트 미리보기에서 보정한 시작·종료 시각(부동 시간).
   * 주면 draft 의 원본 시각 대신 이 값으로 Activity 를 만든다. draft 행 자체는
   * 수정하지 않는다(가져온 시점 미저장 원칙). 헌법 VII: 값은 벽시계(floating)이며
   * 타임존은 라벨이라 시각 숫자를 바꾸지 않는다.
   */
  startTime?: Date;
  endTime?: Date;
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

export async function promoteDraft(
  input: PromoteInput,
): Promise<{ activityId: number }> {
  const draft = await prisma.activityDraft.findFirst({
    where: { id: input.draftId, tripId: input.tripId },
  });
  if (!draft) throw new DraftNotPromotableError("draft_not_found");
  if (draft.status !== "PENDING") {
    throw new DraftNotPromotableError("draft_not_pending");
  }

  const trip = await prisma.trip.findUnique({
    where: { id: input.tripId },
    select: { id: true },
  });
  if (!trip) throw new DraftNotPromotableError("trip_not_found");

  // spec 033 — 보정 시각(override)이 있으면 그 값으로, 없으면 draft 원본으로.
  const effStartTime = input.startTime ?? draft.startTime;
  const effEndTime = input.endTime ?? draft.endTime;

  // Day 매칭/생성 — 보정된 시작 시각의 일자 기준.
  const dayDate = startOfUtcDay(effStartTime);
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
        startTime: effStartTime,
        startTimezone: input.startTimezone,
        endTime: effEndTime,
        endTimezone: input.endTimezone,
        location: input.location ?? draft.locationText,
        memo: draft.description,
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
