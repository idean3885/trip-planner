import { NextResponse } from "next/server";
import { getSession, isHost } from "@/lib/auth-helpers";
import { createInviteToken } from "@/lib/invite-token";

type Params = { params: Promise<{ id: string }> };

// 초대 링크 생성 (JWT, 7일 만료)
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
  const { role } = body;

  if (!role || !["HOST", "GUEST"].includes(role)) {
    return NextResponse.json({ error: "역할은 HOST 또는 GUEST만 가능합니다" }, { status: 400 });
  }

  const token = await createInviteToken({ tripId, role });
  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "";
  const inviteUrl = `${baseUrl}/invite/${token}`;

  return NextResponse.json({ inviteUrl }, { status: 201 });
}
