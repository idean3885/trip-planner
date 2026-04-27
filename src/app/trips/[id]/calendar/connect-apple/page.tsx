/**
 * spec 025 (#417) — Apple 캘린더 연결 위자드 진입 페이지.
 *
 * /trips/[id]/calendar/connect-apple
 *   ?apple_reauth=1 → 재인증 모드 (Step 3부터, 캘린더 재생성 안 함)
 *
 * 권한 검증·redirect는 layout 또는 미들웨어에 위임. 본 페이지는 위자드 컴포넌트를 렌더만.
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
