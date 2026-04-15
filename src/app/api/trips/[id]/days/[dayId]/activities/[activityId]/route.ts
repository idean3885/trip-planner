import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId, canEdit } from "@/lib/auth-helpers";

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

  const body = await request.json();
  const { category, title, startTime, endTime, location, memo, cost, currency, reservationStatus, sortOrder } = body;

  const activity = await prisma.activity.update({
    where: { id: parseInt(activityId), dayId: dayIdNum, day: { tripId } },
    data: {
      ...(category !== undefined && { category }),
      ...(title !== undefined && { title }),
      ...(startTime !== undefined && { startTime }),
      ...(endTime !== undefined && { endTime }),
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
