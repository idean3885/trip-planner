import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId, canEdit } from "@/lib/auth-helpers";

function toTimestamp(value: string | undefined | null, dayDate: Date): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (value.includes("T")) return new Date(value);
  const match = value.match(/^(\d{2}):(\d{2})/);
  if (!match) return null;
  const dt = new Date(dayDate);
  dt.setUTCHours(parseInt(match[1]), parseInt(match[2]), 0, 0);
  return dt;
}

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
  const { category, title, startTime, endTime, location, memo, cost, currency, reservationStatus, sortOrder } = body;

  const activity = await prisma.activity.update({
    where: { id: parseInt(activityId), dayId: dayIdNum, day: { tripId } },
    data: {
      ...(category !== undefined && { category }),
      ...(title !== undefined && { title }),
      ...(startTime !== undefined && { startTime }),
      ...(endTime !== undefined && { endTime }),
      ...(startTime !== undefined && { startTimeTs: toTimestamp(startTime, day.date) }),
      ...(endTime !== undefined && { endTimeTs: toTimestamp(endTime, day.date) }),
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
