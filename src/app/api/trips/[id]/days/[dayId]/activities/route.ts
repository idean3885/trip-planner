import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId, getTripMember, canEdit } from "@/lib/auth-helpers";

/** HH:mm → Day.date 기반 Timestamptz. ISO datetime은 그대로 파싱. */
function toTimestamp(value: string | undefined | null, dayDate: Date): Date | undefined {
  if (!value) return undefined;
  if (value.includes("T")) return new Date(value);
  const match = value.match(/^(\d{2}):(\d{2})/);
  if (!match) return undefined;
  const dt = new Date(dayDate);
  dt.setUTCHours(parseInt(match[1]), parseInt(match[2]), 0, 0);
  return dt;
}

type Params = { params: Promise<{ id: string; dayId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id, dayId } = await params;
  const tripId = parseInt(id);
  const dayIdNum = parseInt(dayId);
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await getTripMember(tripId, userId);
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const activities = await prisma.activity.findMany({
    where: { dayId: dayIdNum, day: { tripId } },
    orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(activities);
}

export async function POST(request: Request, { params }: Params) {
  const { id, dayId } = await params;
  const tripId = parseInt(id);
  const dayIdNum = parseInt(dayId);
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await canEdit(tripId, userId))) {
    return NextResponse.json({ error: "편집 권한이 없습니다" }, { status: 403 });
  }

  const day = await prisma.day.findUnique({
    where: { id: dayIdNum, tripId },
  });
  if (!day) {
    return NextResponse.json({ error: "일자를 찾을 수 없습니다" }, { status: 404 });
  }

  const body = await request.json();
  const { category, title, startTime, endTime, location, memo, cost, currency, reservationStatus, sortOrder } = body;

  if (!category || !title) {
    return NextResponse.json({ error: "category와 title은 필수입니다" }, { status: 400 });
  }

  const activity = await prisma.activity.create({
    data: {
      dayId: dayIdNum,
      category,
      title,
      ...(startTime !== undefined && { startTime }),
      ...(endTime !== undefined && { endTime }),
      ...(startTime !== undefined && { startTimeTs: toTimestamp(startTime, day.date) ?? null }),
      ...(endTime !== undefined && { endTimeTs: toTimestamp(endTime, day.date) ?? null }),
      ...(location !== undefined && { location }),
      ...(memo !== undefined && { memo }),
      ...(cost !== undefined && { cost }),
      ...(currency !== undefined && { currency }),
      ...(reservationStatus !== undefined && { reservationStatus }),
      sortOrder: sortOrder ?? 0,
    },
  });

  return NextResponse.json(activity, { status: 201 });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id, dayId } = await params;
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
  const { orderedIds } = body;

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json({ error: "orderedIds 배열은 필수입니다" }, { status: 400 });
  }

  await prisma.$transaction(
    orderedIds.map((activityId: number, index: number) =>
      prisma.activity.update({
        where: { id: activityId, dayId: dayIdNum, day: { tripId } },
        data: { sortOrder: index },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
