import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth-helpers";

// T024: 여행 목록 (TripMember 기반 필터)
export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trips = await prisma.trip.findMany({
    where: {
      tripMembers: { some: { userId } },
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
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, startDate, endDate } = body as {
    title?: string;
    description?: string;
    startDate?: unknown;
    endDate?: unknown;
  };

  if (!title) {
    return NextResponse.json({ error: "제목은 필수입니다" }, { status: 400 });
  }
  // spec 029 v3.0.0 contract — Trip 생성 시 기간 입력은 더 이상 받지 않는다.
  // 첫 일정을 추가하면 derived 기간이 자동 설정된다.
  if (startDate !== undefined || endDate !== undefined) {
    return NextResponse.json(
      {
        error: "startDate / endDate 입력은 v3.0.0 부터 제거됐습니다. 여행 생성 후 일정을 추가하면 기간이 자동 설정됩니다.",
      },
      { status: 400 },
    );
  }

  const trip = await prisma.trip.create({
    data: {
      title,
      description,
      createdBy: userId,
      updatedBy: userId,
      tripMembers: {
        create: { userId, role: "OWNER" },
      },
    },
  });

  return NextResponse.json(trip, { status: 201 });
}
