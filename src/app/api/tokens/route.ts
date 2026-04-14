import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-helpers";

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

  // 토큰 생성: tp_ prefix + 32바이트 랜덤 hex
  const rawToken = `tp_${randomBytes(32).toString("hex")}`;
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const tokenPrefix = rawToken.slice(0, 11); // "tp_" + 8자

  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

  const pat = await prisma.personalAccessToken.create({
    data: {
      userId: session.user.id,
      name,
      tokenHash,
      tokenPrefix,
      expiresAt,
    },
  });

  return NextResponse.json(
    {
      id: pat.id,
      name: pat.name,
      token: rawToken, // 원문은 이 응답에서만 노출
      tokenPrefix: pat.tokenPrefix,
      expiresAt: pat.expiresAt,
      createdAt: pat.createdAt,
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
