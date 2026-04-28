/**
 * spec 025 (#417) — Apple 캘린더 연결 위자드 진입 페이지.
 *
 * /trips/[id]/calendar/connect-apple
 *   ?apple_reauth=1 → 재인증 모드 (Apple ID 필드 disabled, 캘린더 재생성 안 함)
 *
 * 사용자 세션 이메일을 prefillEmail로 위자드에 전달. 위자드는 단일 화면 +
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
      <AppleConnectWizard
        tripId={tripId}
        prefillEmail={session.user.email ?? undefined}
        reauth={isReauth}
      />
    </main>
  );
}
