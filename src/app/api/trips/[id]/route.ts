import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getTripMember, canEdit, isOwner } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

// T026: 여행 상세
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const tripId = parseInt(id);
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await getTripMember(tripId, session.user.id);
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      days: { orderBy: { sortOrder: "asc" } },
      tripMembers: {
        include: { user: { select: { id: true, name: true, image: true } } },
      },
    },
  });

  if (!trip) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  return NextResponse.json({ ...trip, myRole: member.role });
}

// T026: 여행 수정
export async function PUT(request: Request, { params }: Params) {
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
  const { title, description, startDate, endDate } = body;

  const trip = await prisma.trip.update({
    where: { id: tripId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      updatedBy: session.user.id,
    },
  });

  return NextResponse.json(trip);
}

// T026: 여행 삭제 (HOST만)
export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const tripId = parseInt(id);
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isOwner(tripId, session.user.id))) {
    return NextResponse.json({ error: "주인만 삭제할 수 있습니다" }, { status: 403 });
  }

  await prisma.trip.delete({ where: { id: tripId } });

  return NextResponse.json({ ok: true });
}
