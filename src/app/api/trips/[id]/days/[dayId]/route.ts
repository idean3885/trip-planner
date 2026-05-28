import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId, getTripMember, canEdit } from "@/lib/auth-helpers";
import { withSortOrder } from "@/lib/day-number";
import { getDerivedPeriodTx, getResolvedPeriod } from "@/lib/trip-period";

type Params = { params: Promise<{ id: string; dayId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id, dayId } = await params;
  const tripId = parseInt(id);
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await getTripMember(tripId, userId);
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [trip, day] = await Promise.all([
    prisma.trip.findUnique({
      where: { id: tripId },
      select: { id: true },
    }),
    prisma.day.findUnique({
      where: { id: parseInt(dayId), tripId },
      include: {
        activities: { orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }] },
      },
    }),
  ]);
  if (!trip || !day) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const period = await getResolvedPeriod(tripId);
  return NextResponse.json(withSortOrder(day, period.startDate!));
}

// T030: 일정 수정
export async function PUT(request: Request, { params }: Params) {
  const { id, dayId } = await params;
  const tripId = parseInt(id);
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await canEdit(tripId, userId))) {
    return NextResponse.json({ error: "편집 권한이 없습니다" }, { status: 403 });
  }

  const body = await request.json();
  const { title, content, date } = body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (date !== undefined) {
        const newDate = new Date(date);
        await tx.day.update({
          where: { id: parseInt(dayId), tripId },
          data: {
            ...(title !== undefined && { title }),
            ...(content !== undefined && { content }),
            date: newDate,
          },
        });
      } else {
        await tx.day.update({
          where: { id: parseInt(dayId), tripId },
          data: {
            ...(title !== undefined && { title }),
            ...(content !== undefined && { content }),
          },
        });
      }
      const fresh = await tx.day.findUniqueOrThrow({
        where: { id: parseInt(dayId) },
      });
      const derived = await getDerivedPeriodTx(tx, tripId);
      return { day: fresh, tripStart: derived.startDate! };
    });
    return NextResponse.json(withSortOrder(result.day, result.tripStart));
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "같은 날짜의 Day가 이미 존재합니다" },
        { status: 409 },
      );
    }
    throw e;
  }
}

// T030: 일정 삭제
export async function DELETE(request: Request, { params }: Params) {
  const { id, dayId } = await params;
  const tripId = parseInt(id);
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await canEdit(tripId, userId))) {
    return NextResponse.json({ error: "편집 권한이 없습니다" }, { status: 403 });
  }

  await prisma.day.delete({
    where: { id: parseInt(dayId), tripId },
  });

  return NextResponse.json({ ok: true });
}
