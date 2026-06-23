import { NextRequest, NextResponse } from "next/server";

import { pollDeviceAuthorization } from "@/lib/device-auth";
import { autoPatExpiry, createPAT } from "@/lib/token-helpers";

/**
 * POST /api/auth/device/token — 소비자가 승인 완료를 폴링한다 (spec 060, #793).
 *
 * 인증 불필요(device_code 자체가 자격). 상태머신:
 * - 대기: authorization_pending / 과도 폴링: slow_down(interval 상향)
 * - 승인: createPAT 발급 + 1회 반환(요청은 claim 시 이미 삭제 — rawToken 무저장)
 * - 거부: access_denied / 만료·미존재: expired_token
 */
export async function POST(request: NextRequest) {
  let body: { device_code?: string; label?: string } = {};
  try {
    body = await request.json();
  } catch {
    // 본문 파싱 실패 → invalid_request
  }

  const deviceCode = body.device_code;
  if (!deviceCode) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const outcome = await pollDeviceAuthorization(deviceCode);

  switch (outcome.kind) {
    case "pending":
      return NextResponse.json(
        { error: "authorization_pending", interval: outcome.interval },
        { status: 400 },
      );
    case "slow_down":
      return NextResponse.json(
        { error: "slow_down", interval: outcome.interval },
        { status: 400 },
      );
    case "denied":
      return NextResponse.json({ error: "access_denied" }, { status: 400 });
    case "expired":
      return NextResponse.json({ error: "expired_token" }, { status: 400 });
    case "approved": {
      // spec 059 승계 — 자동 발급 토큰 단기 만료(now+30일). rawToken 은 이 응답으로만 1회 노출.
      const pat = await createPAT(
        outcome.userId,
        body.label ?? "CLI (device)",
        autoPatExpiry(),
      );
      return NextResponse.json({
        access_token: pat.rawToken,
        token_type: "bearer",
        expires_at: pat.expiresAt,
      });
    }
  }
}
