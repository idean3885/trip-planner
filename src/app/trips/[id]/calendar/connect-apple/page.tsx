/**
 * spec 025 (#417) — Apple 캘린더 연결 위자드 진입 페이지.
 *
 * /trips/[id]/calendar/connect-apple
 *   ?apple_reauth=1 → 재인증 모드 (Apple ID 필드 disabled, 캘린더 재생성 안 함)
 *
 * Apple ID 입력란은 비워서 시작한다 — 로그인 이메일(구글 계정 등)은 Apple ID
 * 유추 근거가 아니므로 prefill 하지 않는다(#627). 위자드는 단일 화면 +
 * collapsible 가이드 + dash 자동 포맷팅 + toast 완료(v2.11.5).
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AppleConnectWizard from "@/components/calendar/AppleConnectWizard";

export default async function ConnectAppleCalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ apple_reauth?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }
  const tripId = Number((await params).id);
  if (!Number.isFinite(tripId)) {
    redirect("/trips");
  }
  const sp = await searchParams;
  const isReauth = sp.apple_reauth === "1";

  return (
    <main className="container mx-auto py-8">
      <AppleConnectWizard tripId={tripId} reauth={isReauth} />
    </main>
  );
}
