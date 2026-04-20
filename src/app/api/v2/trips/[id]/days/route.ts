import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId, getTripMember, canEdit } from "@/lib/auth-helpers";
import {
  computeDayNumber,
  expandTripRangeIfNeeded,
  withDayNumber,
} from "@/lib/day-number";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const tripId = parseInt(id);
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [member, trip, days] = await Promise.all([
    getTripMember(tripId, userId),
    prisma.trip.findUnique({
      where: { id: tripId },
      select: { startDate: true },
    }),
    prisma.day.findMany({
      where: { tripId },
      orderBy: { date: "asc" },
    }),
  ]);

  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!trip) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const result = days.map((d) => {
    const enriched = withDayNumber(d, trip.startDate);
    const { sortOrder: _drop, ...rest } = enriched;
    return rest;
  });

  return NextResponse.json(result);
}

export async function POST(request: Request, { params }: Params) {
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
  const { date, title, content } = body;
  if (!date) {
    return NextResponse.json({ error: "날짜는 필수입니다" }, { status: 400 });
  }

  const newDate = new Date(date);

  try {
    const day = await prisma.$transaction(async (tx) => {
      const { trip } = await expandTripRangeIfNeeded(tx, tripId, newDate);
      const dayNumber = computeDayNumber(newDate, trip.startDate);
      const created = await tx.day.create({
        data: {
          tripId,
          date: newDate,
          title,
          content,
          sortOrder: dayNumber,
        },
      });
      return { ...created, dayNumber };
    });
    const { sortOrder: _drop, ...rest } = day;
    return NextResponse.json(rest, { status: 201 });
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
