import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId, getTripMember, canEdit } from "@/lib/auth-helpers";

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

  const day = await prisma.day.findUnique({
    where: { id: parseInt(dayId), tripId },
    include: {
      activities: { orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }] },
    },
  });
  if (!day) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  return NextResponse.json(day);
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
  const { title, content, date, sortOrder } = body;

  const day = await prisma.day.update({
    where: { id: parseInt(dayId), tripId },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(date !== undefined && { date: new Date(date) }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  });

  return NextResponse.json(day);
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
