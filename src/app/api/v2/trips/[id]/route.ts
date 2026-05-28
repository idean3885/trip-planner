import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId, getTripMember, canEdit, isOwner } from "@/lib/auth-helpers";
import { withDayNumber } from "@/lib/day-number";
import { getResolvedPeriod } from "@/lib/trip-period";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const tripId = parseInt(id);
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [member, trip] = await Promise.all([
    getTripMember(tripId, userId),
    prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        days: {
          orderBy: { date: "asc" },
          include: {
            // spec 029 #595 — 통합 캘린더 다른 trip 일정 카드 표시용. 기존
            // _count 필드는 호환 위해 유지(클라이언트가 둘 다 읽을 수 있음).
            activities: { orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }] },
            _count: { select: { activities: true } },
          },
        },
        tripMembers: {
          include: { user: { select: { id: true, name: true, image: true } } },
        },
      },
    }),
  ]);

  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!trip) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const period = await getResolvedPeriod(tripId, {
    startDate: trip.startDate,
    endDate: trip.endDate,
  });
  const days = trip.days.map((d) => withDayNumber(d, period.startDate));
  return NextResponse.json({
    ...trip,
    startDate: period.startDate,
    endDate: period.endDate,
    days,
    myRole: member.role,
  });
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const tripId = parseInt(id);
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await canEdit(tripId, userId))) {
    return NextResponse.json({ error: "편집 권한이 없습니다" }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, startDate, endDate } = body;

  if (startDate === null || endDate === null) {
    return NextResponse.json(
      { error: "startDate / endDate는 필수입니다" },
      { status: 400 },
    );
  }

  const trip = await prisma.trip.update({
    where: { id: tripId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: new Date(endDate) }),
      updatedBy: userId,
    },
  });

  return NextResponse.json(trip);
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const tripId = parseInt(id);
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isOwner(tripId, userId))) {
    return NextResponse.json({ error: "주인만 삭제할 수 있습니다" }, { status: 403 });
  }

  await prisma.trip.delete({ where: { id: tripId } });
  return NextResponse.json({ ok: true });
}
