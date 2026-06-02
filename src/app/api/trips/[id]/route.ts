import { NextResponse } from "next/server";

import {
  canEdit,
  getAuthUserId,
  getTripMember,
  isOwner,
} from "@/lib/auth-helpers";
import { withSortOrder } from "@/lib/day-number";
import { prisma } from "@/lib/prisma";
import { getResolvedPeriod } from "@/lib/trip-period";

type Params = { params: Promise<{ id: string }> };

// T026: 여행 상세
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
          include: { _count: { select: { activities: true } } },
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

  const period = await getResolvedPeriod(tripId);
  const days = period.startDate
    ? trip.days.map((d) => withSortOrder(d, period.startDate as Date))
    : [];
  return NextResponse.json({
    ...trip,
    startDate: period.startDate,
    endDate: period.endDate,
    days,
    myRole: member.role,
  });
}

// T026: 여행 수정
export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const tripId = parseInt(id);
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await canEdit(tripId, userId))) {
    return NextResponse.json(
      { error: "편집 권한이 없습니다" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const { title, description, startDate, endDate } = body as {
    title?: string;
    description?: string;
    startDate?: unknown;
    endDate?: unknown;
  };

  if (startDate !== undefined || endDate !== undefined) {
    return NextResponse.json(
      {
        error:
          "startDate / endDate 입력은 v3.0.0 부터 제거됐습니다. 일정을 추가/삭제하면 자동으로 갱신됩니다.",
      },
      { status: 400 },
    );
  }

  const trip = await prisma.trip.update({
    where: { id: tripId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      updatedBy: userId,
    },
  });

  return NextResponse.json(trip);
}

// T026: 여행 삭제 (HOST만)
export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const tripId = parseInt(id);
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isOwner(tripId, userId))) {
    return NextResponse.json(
      { error: "주인만 삭제할 수 있습니다" },
      { status: 403 },
    );
  }

  await prisma.trip.delete({ where: { id: tripId } });

  return NextResponse.json({ ok: true });
}
