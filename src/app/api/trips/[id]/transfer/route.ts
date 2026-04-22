import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId, isOwner } from "@/lib/auth-helpers";
import { onOwnerTransfer } from "@/lib/gcal/member-sync";

type Params = { params: Promise<{ id: string }> };

// T047: 주인 양도
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const tripId = parseInt(id);
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isOwner(tripId, userId))) {
    return NextResponse.json({ error: "주인만 양도할 수 있습니다" }, { status: 403 });
  }

  const body = await request.json();
  const { targetMemberId } = body;

  const target = await prisma.tripMember.findUnique({ where: { id: targetMemberId } });
  if (!target || target.tripId !== tripId) {
    return NextResponse.json({ error: "멤버를 찾을 수 없습니다" }, { status: 404 });
  }

  if (target.role !== "HOST") {
    return NextResponse.json({ error: "호스트에게만 양도할 수 있습니다" }, { status: 400 });
  }

  // 트랜잭션: 대상 → OWNER, 기존 주인 → HOST
  const currentOwner = await prisma.tripMember.findFirst({
    where: { tripId, userId, role: "OWNER" },
  });

  if (!currentOwner) {
    return NextResponse.json({ error: "주인 정보를 찾을 수 없습니다" }, { status: 500 });
  }

  await prisma.$transaction([
    prisma.tripMember.update({ where: { id: target.id }, data: { role: "OWNER" } }),
    prisma.tripMember.update({ where: { id: currentOwner.id }, data: { role: "HOST" } }),
  ]);

  // 공유 캘린더의 기록상 오너 필드도 갱신 (데이터 오너는 Google 제약으로 이전 불가 — 메모 유지).
  await prisma.tripCalendarLink.updateMany({
    where: { tripId },
    data: { ownerId: target.userId },
  });

  await onOwnerTransfer(tripId, currentOwner.userId, target.userId);

  return NextResponse.json({ ok: true });
}
