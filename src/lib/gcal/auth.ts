/**
 * Google Calendar scope 증분 동의 관련 헬퍼.
 *
 * 흐름:
 *  1) API 라우트가 hasCalendarScope()로 현재 사용자의 scope를 확인
 *  2) 없으면 `{ error: "consent_required", authorizationUrl }`로 응답
 *  3) 클라이언트가 authorizationUrl로 이동하면 /api/gcal/consent 핸들러가
 *     Auth.js signIn을 호출해 Google 동의 화면으로 리디렉트 (include_granted_scopes=true).
 *  4) Auth.js 기본 callback(/api/auth/callback/google)이 새 scope를 Account에 반영.
 */

import { prisma } from "@/lib/prisma";
import { GCAL_SCOPE } from "@/types/gcal";

const GOOGLE_PROVIDER = "google";
// 구버전에서 받은 events-only scope도 사용자의 유효 권한으로 인정해 재동의 요구를 최소화한다.
const LEGACY_EVENTS_SCOPE = "https://www.googleapis.com/auth/calendar.events";

/** 현재 사용자의 Google Account가 Calendar 관련 scope를 이미 보유하는지 확인. */
export async function hasCalendarScope(userId: string): Promise<boolean> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: GOOGLE_PROVIDER },
    select: { scope: true },
  });
  if (!account?.scope) return false;
  const scopes = account.scope.split(/\s+/);
  return scopes.includes(GCAL_SCOPE) || scopes.includes(LEGACY_EVENTS_SCOPE);
}

/**
 * 현재 트립으로 돌아오도록 returnTo를 포함한 동의 시작 URL.
 * 실제 Google 리디렉트는 /api/gcal/consent 핸들러가 signIn으로 수행한다.
 */
export function buildConsentRedirectUrl(returnTo: string): string {
  const params = new URLSearchParams({ returnTo });
  return `/api/gcal/consent?${params.toString()}`;
}
