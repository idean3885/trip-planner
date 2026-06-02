import { NextResponse } from "next/server";

import { canEdit, getAuthUserId, getTripMember } from "@/lib/auth-helpers";
import { computeDayNumber, withDayNumber } from "@/lib/day-number";
import { prisma } from "@/lib/prisma";
import { getDerivedPeriodTx, getResolvedPeriod } from "@/lib/trip-period";

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
      select: { id: true },
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

  const period = await getResolvedPeriod(tripId);
  if (!period.startDate) {
    // 일정 0건 trip 은 days 도 빈 배열이라 dayNumber 계산 불필요.
    return NextResponse.json([]);
  }
  return NextResponse.json(
    days.map((d) => withDayNumber(d, period.startDate as Date)),
  );
}

export async function POST(request: Request, { params }: Params) {
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
  const { date, title, content } = body;
  if (!date) {
    return NextResponse.json({ error: "날짜는 필수입니다" }, { status: 400 });
  }

  const newDate = new Date(date);

  try {
    const day = await prisma.$transaction(async (tx) => {
      const created = await tx.day.create({
        data: { tripId, date: newDate, title, content },
      });
      const derived = await getDerivedPeriodTx(tx, tripId);
      // 방금 insert 한 day 가 포함된 derived 이므로 startDate 는 항상 non-null.
      const dayNumber = computeDayNumber(created.date, derived.startDate!);
      return { ...created, dayNumber };
    });
    return NextResponse.json(day, { status: 201 });
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
