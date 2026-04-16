import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { createPAT } from "@/lib/token-helpers";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/tokens — PAT 생성
 * 세션 인증 필수 (토큰으로 토큰 생성 불가)
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 },
    );
  }

  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  const result = await createPAT(session.user.id, name, expiresAt);

  return NextResponse.json(
    {
      id: result.id,
      name: result.name,
      token: result.rawToken, // 원문은 이 응답에서만 노출
      tokenPrefix: result.tokenPrefix,
      expiresAt: result.expiresAt,
      createdAt: result.createdAt,
    },
    { status: 201 },
  );
}

/**
 * GET /api/tokens — 본인 토큰 목록
 * 세션 인증 필수
 */
export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokens = await prisma.personalAccessToken.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      expiresAt: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tokens);
}
