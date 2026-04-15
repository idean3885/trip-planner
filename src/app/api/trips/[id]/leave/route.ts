import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId, getTripMember } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

// T046: 자발적 탈퇴
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const tripId = parseInt(id);
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await getTripMember(tripId, userId);
  if (!member) {
    return NextResponse.json({ error: "멤버가 아닙니다" }, { status: 400 });
  }

  // 주인은 양도 후 탈퇴
  if (member.role === "OWNER") {
    return NextResponse.json(
      { error: "주인은 다른 호스트에게 양도한 후 탈퇴할 수 있습니다" },
      { status: 400 }
    );
  }

  await prisma.tripMember.delete({ where: { id: member.id } });

  return NextResponse.json({ ok: true });
}
