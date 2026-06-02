/**
 * /settings/calendars — 사용자 단위 외부 캘린더 자격증명 관리.
 *
 * trip 권한과 무관하게 Apple 자격증명을 등록·갱신·삭제할 수 있다. Apple은
 * OAuth 미지원이라 앱 전용 암호 수기 등록이 필수이며, 등록은 user-level
 * AppleCalendarCredential 1건으로 표현된다.
 *
 * trip 공유 캘린더 생성(connect)은 별도 진입점(`/trips/[id]/calendar/connect-apple`,
 * OWNER 전용)에서 처리한다.
 */

import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import AppleConnectWizard from "@/components/calendar/AppleConnectWizard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CalendarsSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }
  const userId = session.user.id;
  const cred = await prisma.appleCalendarCredential.findUnique({
    where: { userId },
    select: { appleId: true, updatedAt: true },
  });

  return (
    <main className="container mx-auto space-y-8 py-8">
      <nav className="text-muted-foreground flex items-center gap-2 text-sm">
        <Link href="/" className="hover:text-foreground">
          홈
        </Link>
        <span aria-hidden>·</span>
        <Link href="/settings" className="hover:text-foreground">
          설정
        </Link>
        <span aria-hidden>·</span>
        <span className="text-foreground">캘린더</span>
      </nav>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">외부 캘린더</h1>
        <p className="text-muted-foreground text-sm">
          외부 캘린더 자격증명을 등록·갱신합니다. trip별 공유 캘린더 생성은 trip
          상세 화면에서 별도로 진행합니다.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Apple iCloud</h2>
        {cred ? (
          <div className="rounded-md border p-3 text-sm">
            <p>
              <span className="font-medium">{cred.appleId}</span> 등록됨
            </p>
            <p className="text-muted-foreground text-xs">
              마지막 갱신:{" "}
              {new Date(cred.updatedAt).toLocaleDateString("ko-KR")}
            </p>
            <p className="text-muted-foreground mt-2 text-xs">
              자격증명이 만료됐거나 변경되었다면 아래 양식으로 다시 등록하세요.
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            아직 등록된 자격증명이 없습니다.
          </p>
        )}

        {/* 재등록 편의로 이미 등록된 Apple ID 만 prefill. 로그인 이메일은 채우지
            않는다(Apple ID 유추 근거 아님, #627). */}
        <AppleConnectWizard prefillEmail={cred?.appleId ?? undefined} />
      </section>
    </main>
  );
}
