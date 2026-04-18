import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId, canEdit } from "@/lib/auth-helpers";
import { toTimestamp } from "@/lib/activity-time";

type Params = { params: Promise<{ id: string; dayId: string; activityId: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { id, dayId, activityId } = await params;
  const tripId = parseInt(id);
  const dayIdNum = parseInt(dayId);
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await canEdit(tripId, userId))) {
    return NextResponse.json({ error: "편집 권한이 없습니다" }, { status: 403 });
  }

  const day = await prisma.day.findUnique({ where: { id: dayIdNum, tripId } });
  if (!day) {
    return NextResponse.json({ error: "일자를 찾을 수 없습니다" }, { status: 404 });
  }

  const body = await request.json();
  const { category, title, startTime, startTimezone, endTime, endTimezone, location, memo, cost, currency, reservationStatus, sortOrder } = body;

  // HH:mm을 IANA timezone 기준으로 UTC 변환하려면 기존 timezone이 필요하다 (#232).
  // 요청에 timezone이 없으면 DB에 저장된 값을 fallback으로 사용한다.
  const needsExistingTz =
    (startTime !== undefined && startTimezone === undefined && typeof startTime === "string" && !startTime.includes("T")) ||
    (endTime !== undefined && endTimezone === undefined && typeof endTime === "string" && !endTime.includes("T"));
  let existingStartTz: string | null | undefined;
  let existingEndTz: string | null | undefined;
  if (needsExistingTz) {
    const existing = await prisma.activity.findUnique({
      where: { id: parseInt(activityId), dayId: dayIdNum, day: { tripId } },
      select: { startTimezone: true, endTimezone: true },
    });
    existingStartTz = existing?.startTimezone;
    existingEndTz = existing?.endTimezone;
  }
  const effStartTz = startTimezone !== undefined ? startTimezone : existingStartTz;
  const effEndTz = endTimezone !== undefined ? endTimezone : (existingEndTz ?? effStartTz);

  const activity = await prisma.activity.update({
    where: { id: parseInt(activityId), dayId: dayIdNum, day: { tripId } },
    data: {
      ...(category !== undefined && { category }),
      ...(title !== undefined && { title }),
      ...(startTime !== undefined && { startTime: toTimestamp(startTime, day.date, effStartTz) }),
      ...(startTimezone !== undefined && { startTimezone }),
      ...(endTime !== undefined && { endTime: toTimestamp(endTime, day.date, effEndTz) }),
      ...(endTimezone !== undefined && { endTimezone }),
      ...(location !== undefined && { location }),
      ...(memo !== undefined && { memo }),
      ...(cost !== undefined && { cost }),
      ...(currency !== undefined && { currency }),
      ...(reservationStatus !== undefined && { reservationStatus }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  });

  return NextResponse.json(activity);
}

export async function DELETE(request: Request, { params }: Params) {
  const { id, dayId, activityId } = await params;
  const tripId = parseInt(id);
  const dayIdNum = parseInt(dayId);
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await canEdit(tripId, userId))) {
    return NextResponse.json({ error: "편집 권한이 없습니다" }, { status: 403 });
  }

  await prisma.activity.delete({
    where: { id: parseInt(activityId), dayId: dayIdNum, day: { tripId } },
  });

  return NextResponse.json({ ok: true });
}
