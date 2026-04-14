import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getTripMember, canEdit } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

// T029: 일정 목록
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const tripId = parseInt(id);
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [member, days] = await Promise.all([
    getTripMember(tripId, session.user.id),
    prisma.day.findMany({
      where: { tripId },
      orderBy: { sortOrder: "asc" },
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
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await canEdit(tripId, session.user.id))) {
    return NextResponse.json({ error: "편집 권한이 없습니다" }, { status: 403 });
  }

  const body = await request.json();
  const { date, title, content, sortOrder } = body;

  if (!date) {
    return NextResponse.json({ error: "날짜는 필수입니다" }, { status: 400 });
  }

  const day = await prisma.day.create({
    data: {
      tripId,
      date: new Date(date),
      title,
      content,
      sortOrder: sortOrder ?? 0,
    },
  });

  return NextResponse.json(day, { status: 201 });
}
