import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isHost } from "@/lib/auth-helpers";
import crypto from "crypto";

type Params = { params: Promise<{ id: string }> };

// T041: 초대 목록 조회
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const tripId = parseInt(id);
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isHost(tripId, session.user.id))) {
    return NextResponse.json({ error: "호스트만 초대를 관리할 수 있습니다" }, { status: 403 });
  }

  const invitations = await prisma.invitation.findMany({
    where: { tripId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invitations);
}

// T038: 초대 링크 생성
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const tripId = parseInt(id);
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isHost(tripId, session.user.id))) {
    return NextResponse.json({ error: "호스트만 초대할 수 있습니다" }, { status: 403 });
  }

  const body = await request.json();
  const { email, role } = body;

  if (!email) {
    return NextResponse.json({ error: "이메일은 필수입니다" }, { status: 400 });
  }

  if (role && !["HOST", "GUEST"].includes(role)) {
    return NextResponse.json({ error: "역할은 HOST 또는 GUEST만 가능합니다" }, { status: 400 });
  }

  // 기존 대기 중 초대 만료 처리
  await prisma.invitation.updateMany({
    where: { tripId, email, status: "PENDING" },
    data: { status: "EXPIRED" },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7일

  const invitation = await prisma.invitation.create({
    data: {
      tripId,
      invitedById: session.user.id,
      email,
      token,
      role: role || "GUEST",
      expiresAt,
    },
  });

  return NextResponse.json(
    {
      ...invitation,
      inviteUrl: `${process.env.NEXTAUTH_URL || ""}/invite/${token}`,
    },
    { status: 201 }
  );
}
