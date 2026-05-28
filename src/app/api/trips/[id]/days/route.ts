import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId, getTripMember, canEdit } from "@/lib/auth-helpers";
import { withSortOrder } from "@/lib/day-number";
import { getDerivedPeriodTx, getResolvedPeriod } from "@/lib/trip-period";

type Params = { params: Promise<{ id: string }> };

// T029: 일정 목록 (v1 — sortOrder 응답 동적 부착, MCP 호환)
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
    return NextResponse.json([]);
  }
  return NextResponse.json(
    days.map((d) => withSortOrder(d, period.startDate as Date)),
  );
}

// T029: 일정 추가
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
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.day.create({
        data: { tripId, date: newDate, title, content },
      });
      const derived = await getDerivedPeriodTx(tx, tripId);
      return { day: created, tripStartDate: derived.startDate! };
    });
    return NextResponse.json(
      withSortOrder(result.day, result.tripStartDate),
      { status: 201 },
    );
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
