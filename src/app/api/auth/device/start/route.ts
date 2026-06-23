import { NextRequest, NextResponse } from "next/server";

import { cleanupExpired, startDeviceAuthorization } from "@/lib/device-auth";

/**
 * POST /api/auth/device/start — 헤드리스 소비자가 인증을 개시한다 (spec 060, #793).
 *
 * 인증 불필요(아직 토큰 없음). device_code(소비자 보관)·user_code(사람 대조)·
 * 승인 주소를 발급한다. 사람은 verification_uri_complete 를 탭해 /device 승인 화면에
 * 도달한다. loopback 수신 포트를 쓰지 않는다.
 */
export async function POST(request: NextRequest) {
  await cleanupExpired().catch(() => {}); // lazy 정리(만료 행)

  const { deviceCode, userCode, expiresAt, interval } =
    await startDeviceAuthorization();

  const origin = request.nextUrl.origin;
  const verificationUri = `${origin}/device`;
  const verificationUriComplete = `${verificationUri}?user_code=${encodeURIComponent(userCode)}`;

  return NextResponse.json({
    device_code: deviceCode,
    user_code: userCode,
    verification_uri: verificationUri,
    verification_uri_complete: verificationUriComplete,
    expires_in: Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000)),
    interval,
  });
}
