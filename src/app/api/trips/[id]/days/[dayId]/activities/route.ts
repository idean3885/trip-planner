import { NextResponse } from "next/server";

import { toTimestamp } from "@/lib/activity-time";
import { canEdit, getAuthUserId, getTripMember } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

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
    return NextResponse.json(
      { error: "편집 권한이 없습니다" },
      { status: 403 },
    );
  }

  const day = await prisma.day.findUnique({
    where: { id: dayIdNum, tripId },
  });
  if (!day) {
    return NextResponse.json(
      { error: "일자를 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  const body = await request.json();
  const {
    category,
    title,
    startTime,
    startTimezone,
    endTime,
    endTimezone,
    location,
    memo,
    url,
    cost,
    currency,
    paymentTiming,
    allDay,
    sortOrder,
  } = body;

  if (!category || !title) {
    return NextResponse.json(
      { error: "category와 title은 필수입니다" },
      { status: 400 },
    );
  }

  // #740 — 종일 활동은 특정 시각이 없다. 동기화·정렬 기준을 위해 시각 앵커를 그
  // 날 날짜(00:00)로 두고 시간대는 비운다(표시는 "종일"). 시간 활동은 기존대로.
  const isAllDay = allDay === true;

  const activity = await prisma.activity.create({
    data: {
      dayId: dayIdNum,
      category,
      title,
      allDay: isAllDay,
      ...(isAllDay
        ? {
            startTime: day.date,
            endTime: null,
            startTimezone: null,
            endTimezone: null,
          }
        : {
            ...(startTime !== undefined && {
              startTime:
                toTimestamp(startTime, day.date, startTimezone) ?? null,
            }),
            ...(startTimezone !== undefined && { startTimezone }),
            ...(endTime !== undefined && {
              endTime:
                toTimestamp(endTime, day.date, endTimezone ?? startTimezone) ??
                null,
            }),
            ...(endTimezone !== undefined && { endTimezone }),
          }),
      ...(location !== undefined && { location }),
      ...(memo !== undefined && { memo }),
      // 빈 문자열은 "없음"으로 정규화해 NULL 로 저장한다.
      ...(url !== undefined && { url: url === "" ? null : url }),
      ...(cost !== undefined && { cost }),
      ...(currency !== undefined && { currency }),
      ...(paymentTiming !== undefined && { paymentTiming }),
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
    return NextResponse.json(
      { error: "편집 권한이 없습니다" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const { orderedIds } = body;

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json(
      { error: "orderedIds 배열은 필수입니다" },
      { status: 400 },
    );
  }

  await prisma.$transaction(
    orderedIds.map((activityId: number, index: number) =>
      prisma.activity.update({
        where: { id: activityId, dayId: dayIdNum, day: { tripId } },
        data: { sortOrder: index },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
