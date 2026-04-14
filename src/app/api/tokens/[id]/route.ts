import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-helpers";

/**
 * DELETE /api/tokens/[id] — 토큰 삭제 (즉시 무효화)
 * 세션 인증 필수, 본인 토큰만 삭제 가능
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tokenId = parseInt(id, 10);
  if (isNaN(tokenId)) {
    return NextResponse.json({ error: "Invalid token ID" }, { status: 400 });
  }

  const token = await prisma.personalAccessToken.findUnique({
    where: { id: tokenId },
  });

  if (!token) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  if (token.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.personalAccessToken.delete({
    where: { id: tokenId },
  });

  return NextResponse.json({ ok: true });
}
