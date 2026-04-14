import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-helpers";

// T024: 여행 목록 (TripMember 기반 필터)
export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trips = await prisma.trip.findMany({
    where: {
      tripMembers: { some: { userId: session.user.id } },
    },
    include: {
      tripMembers: { select: { role: true, userId: true } },
      _count: { select: { days: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(trips);
}

// T025: 여행 생성 (생성자를 HOST로 등록)
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, startDate, endDate } = body;

  if (!title) {
    return NextResponse.json({ error: "제목은 필수입니다" }, { status: 400 });
  }

  const trip = await prisma.trip.create({
    data: {
      title,
      description,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      createdBy: session.user.id,
      updatedBy: session.user.id,
      tripMembers: {
        create: { userId: session.user.id, role: "HOST" },
      },
    },
  });

  return NextResponse.json(trip, { status: 201 });
}
