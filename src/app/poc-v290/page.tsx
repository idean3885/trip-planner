/**
 * PoC v2.9.0 — Google Calendar 공유 플로우 수동 검증 페이지.
 *
 * 배포 조건: VERCEL_ENV !== "production" (dev.trip.idean.me + preview URL + 로컬)
 * 사용법: Google 로그인 후 "내 상태" 확인 → "오너 시나리오" 또는 "게스트 시나리오" 실행.
 */

import { notFound } from "next/navigation";
import { PocPanel } from "./panel";

export const metadata = {
  title: "PoC v2.9.0 — GCal Share Flow",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function PocV290Page() {
  if (process.env.VERCEL_ENV === "production") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">PoC v2.9.0 — Google Calendar Share Flow</h1>
        <p className="text-muted-foreground text-sm">
          Epic #349 기술 검증. 본 페이지는 프로덕션(trip.idean.me)에서 404.
        </p>
      </header>
      <PocPanel />
    </div>
  );
}
