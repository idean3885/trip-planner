import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { autoPatExpiry, createPAT } from "@/lib/token-helpers";

/**
 * GET /api/auth/cli — CLI/MCP 브라우저 인증
 *
 * 1. port + state 파라미터 검증
 * 2. 미로그인 → /auth/signin 리다이렉트 (callbackUrl로 돌아옴)
 * 3. 로그인됨 → PAT 자동 발급 → http://127.0.0.1:PORT/callback 리다이렉트
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const portStr = searchParams.get("port");
  const state = searchParams.get("state");

  // ── 파라미터 검증 ──
  if (!portStr || !state) {
    return NextResponse.json(
      { error: "port and state parameters are required" },
      { status: 400 },
    );
  }

  const port = parseInt(portStr, 10);
  if (isNaN(port) || port < 1024 || port > 65535) {
    return NextResponse.json(
      { error: "Invalid port: must be 1024-65535" },
      { status: 400 },
    );
  }

  if (state.length < 16) {
    return NextResponse.json(
      { error: "Invalid state: must be at least 16 characters" },
      { status: 400 },
    );
  }

  // ── 세션 확인 ──
  const session = await auth();
  if (!session?.user?.id) {
    const callbackUrl = `/api/auth/cli?port=${port}&state=${encodeURIComponent(state)}`;
    const signinUrl = `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    return NextResponse.redirect(new URL(signinUrl, request.url));
  }

  // ── PAT 발급 + localhost 리다이렉트 ──
  // spec 059 — 자동 발급 토큰은 단기 만료(now+30일). 만료 시 MCP는 401 자동
  // 재인증, 일반 소비자는 재로그인 안내. 장수명 토큰 무기한 보관 방지.
  const result = await createPAT(
    session.user.id,
    "CLI (자동 로그인)",
    autoPatExpiry(),
  );
  const callbackUrl = `http://127.0.0.1:${port}/callback?token=${encodeURIComponent(result.rawToken)}&state=${encodeURIComponent(state)}`;

  return NextResponse.redirect(callbackUrl);
}
