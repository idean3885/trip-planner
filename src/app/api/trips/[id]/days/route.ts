import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId, getTripMember, canEdit } from "@/lib/auth-helpers";
import { resortDaysByDate } from "@/lib/day-order";

type Params = { params: Promise<{ id: string }> };

// T029: 일정 목록
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const tripId = parseInt(id);
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [member, days] = await Promise.all([
    getTripMember(tripId, userId),
    prisma.day.findMany({
      where: { tripId },
      orderBy: { date: "asc" },
    }),
  ]);

  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(days);
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

  // sortOrder는 서버가 date 순 기준으로 자동 채번한다(#285). 클라이언트 값은 무시.
  const day = await prisma.$transaction(async (tx) => {
    const created = await tx.day.create({
      data: {
        tripId,
        date: new Date(date),
        title,
        content,
        sortOrder: 0,
      },
    });
    await resortDaysByDate(tx, tripId);
    return tx.day.findUniqueOrThrow({ where: { id: created.id } });
  });

  return NextResponse.json(day, { status: 201 });
}
