import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth-helpers";
import { approveDeviceRequest, denyDeviceRequest } from "@/lib/device-auth";

/**
 * POST /api/auth/device/approve — 사람(브라우저 세션)이 device 요청을 승인/거부 (spec 060, #793).
 *
 * 세션 인증 필수(신원은 사람만 보유). 승인은 **로그인 본인 계정** 토큰만 발급되도록
 * userId 를 기록한다(헌법 VI). 토큰은 여기서 만들지 않는다 — 소비자의 다음 폴링이
 * createPAT 로 발급한다.
 *
 * body: { user_code: string, decision: "approve" | "deny" }
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: { user_code?: string; decision?: string } = {};
  try {
    body = await request.json();
  } catch {
    // fallthrough → invalid
  }
  const userCode = body.user_code;
  const decision = body.decision;
  if (!userCode || (decision !== "approve" && decision !== "deny")) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const ok =
    decision === "approve"
      ? await approveDeviceRequest(userCode, userId)
      : await denyDeviceRequest(userCode);

  // ok=false → 만료/이미 처리됨. 200 + {ok:false} 로 화면이 안내.
  return NextResponse.json({ ok });
}
