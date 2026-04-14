import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, getTripMember, isHost, isOwner } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

// T042: 멤버 목록
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const tripId = parseInt(id);
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [member, members] = await Promise.all([
    getTripMember(tripId, session.user.id),
    prisma.tripMember.findMany({
      where: { tripId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    }),
  ]);

  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ members, myRole: member.role });
}

// T043~T044: 역할 변경 (승격/강등)
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const tripId = parseInt(id);
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { memberId, action } = body; // action: "promote" | "demote"

  if (!memberId || !["promote", "demote"].includes(action)) {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }

  const target = await prisma.tripMember.findUnique({ where: { id: memberId } });
  if (!target || target.tripId !== tripId) {
    return NextResponse.json({ error: "멤버를 찾을 수 없습니다" }, { status: 404 });
  }

  if (action === "promote") {
    // 게스트 → 호스트: 호스트면 가능
    if (target.role !== "GUEST") {
      return NextResponse.json({ error: "게스트만 승격할 수 있습니다" }, { status: 400 });
    }
    if (!(await isHost(tripId, session.user.id))) {
      return NextResponse.json({ error: "호스트만 승격할 수 있습니다" }, { status: 403 });
    }
    await prisma.tripMember.update({ where: { id: memberId }, data: { role: "HOST" } });
  } else {
    // 호스트 → 게스트: 주인만 가능
    if (target.role !== "HOST") {
      return NextResponse.json({ error: "호스트만 강등할 수 있습니다" }, { status: 400 });
    }
    if (!(await isOwner(tripId, session.user.id))) {
      return NextResponse.json({ error: "주인만 강등할 수 있습니다" }, { status: 403 });
    }
    await prisma.tripMember.update({ where: { id: memberId }, data: { role: "GUEST" } });
  }

  return NextResponse.json({ ok: true });
}

// T045: 멤버 제거
export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const tripId = parseInt(id);
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const memberId = parseInt(searchParams.get("memberId") || "");

  if (isNaN(memberId)) {
    return NextResponse.json({ error: "memberId가 필요합니다" }, { status: 400 });
  }

  const target = await prisma.tripMember.findUnique({ where: { id: memberId } });
  if (!target || target.tripId !== tripId) {
    return NextResponse.json({ error: "멤버를 찾을 수 없습니다" }, { status: 404 });
  }

  // 주인은 제거 불가 (양도 후 탈퇴)
  if (target.role === "OWNER") {
    return NextResponse.json({ error: "주인은 제거할 수 없습니다. 먼저 양도하세요" }, { status: 400 });
  }

  // 호스트 제거는 주인만
  if (target.role === "HOST" && !(await isOwner(tripId, session.user.id))) {
    return NextResponse.json({ error: "주인만 호스트를 제거할 수 있습니다" }, { status: 403 });
  }

  // 게스트 제거는 호스트면 가능
  if (target.role === "GUEST" && !(await isHost(tripId, session.user.id))) {
    return NextResponse.json({ error: "호스트만 게스트를 제거할 수 있습니다" }, { status: 403 });
  }

  await prisma.tripMember.delete({ where: { id: memberId } });

  return NextResponse.json({ ok: true });
}
