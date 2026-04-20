/**
 * Google Calendar scope 증분 동의 진입점.
 *
 * GET /api/gcal/consent?returnTo=<내부 경로>
 *
 * Auth.js signIn을 서버 사이드에서 호출해 Google OAuth 동의 화면으로 리디렉트한다.
 * include_granted_scopes=true + prompt=consent로 기존 scope를 유지하면서 calendar.events
 * scope만 추가 확보한다. 동의 완료 후 Auth.js 기본 callback이 Account.scope를 갱신하고,
 * 사용자를 returnTo로 복귀시킨다.
 */

import { NextRequest } from "next/server";
import { signIn } from "@/auth";
import { GCAL_SCOPE } from "@/types/gcal";

export async function GET(req: NextRequest) {
  const returnTo = req.nextUrl.searchParams.get("returnTo") ?? "/";
  return signIn(
    "google",
    { redirectTo: returnTo },
    {
      scope: `openid email profile ${GCAL_SCOPE}`,
      include_granted_scopes: "true",
      prompt: "consent",
      access_type: "offline",
    }
  );
}
