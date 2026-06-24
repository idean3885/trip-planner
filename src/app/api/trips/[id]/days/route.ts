import { NextResponse } from "next/server";

import { canEdit, getAuthUserId, getTripMember } from "@/lib/auth-helpers";
import { withSortOrder } from "@/lib/day-number";
import { prisma } from "@/lib/prisma";
import { getDerivedPeriodTx, getResolvedPeriod } from "@/lib/trip-period";

type Params = { params: Promise<{ id: string }> };

// T029: 일정 목록 (v1 — sortOrder 응답 동적 부착, MCP 호환)
// #669: activities 쿼리가 있으면 from/to 범위 Day 의 활동까지 포함해 응답한다
// (여행 상세 일정 윈도우 로딩). 쿼리가 없으면 기존 경량 목록(인덱스) 그대로.
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const tripId = parseInt(id);
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const wantActivities = url.searchParams.get("activities") != null;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const [member, trip] = await Promise.all([
    getTripMember(tripId, userId),
    prisma.trip.findUnique({ where: { id: tripId }, select: { id: true } }),
  ]);
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!trip) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  // 윈도우 모드 — 범위 내 Day 의 활동을 client 캐시 형태로 응답.
  if (wantActivities) {
    const dateFilter =
      from && to ? { date: { gte: new Date(from), lte: new Date(to) } } : {};
    const days = await prisma.day.findMany({
      where: { tripId, ...dateFilter },
      orderBy: { date: "asc" },
      include: {
        activities: { orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }] },
      },
    });
    return NextResponse.json(
      days.map((d) => ({
        id: d.id,
        date: d.date.toISOString(),
        activities: d.activities.map((a) => ({
          id: a.id,
          title: a.title,
          category: a.category,
          startTime: a.startTime ? a.startTime.toISOString() : null,
          startTimezone: a.startTimezone ?? null,
          endTime: a.endTime ? a.endTime.toISOString() : null,
          endTimezone: a.endTimezone ?? null,
          location: a.location,
          memo: a.memo,
          cost: a.cost ? a.cost.toString() : null,
          currency: a.currency,
          paymentTiming: a.paymentTiming,
          sortOrder: a.sortOrder,
        })),
      })),
    );
  }

  const [days, period] = await Promise.all([
    prisma.day.findMany({ where: { tripId }, orderBy: { date: "asc" } }),
    getResolvedPeriod(tripId),
  ]);
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
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.day.create({
        data: { tripId, date: newDate, title, content },
      });
      const derived = await getDerivedPeriodTx(tx, tripId);
      return { day: created, tripStartDate: derived.startDate! };
    });
    return NextResponse.json(withSortOrder(result.day, result.tripStartDate), {
      status: 201,
    });
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
