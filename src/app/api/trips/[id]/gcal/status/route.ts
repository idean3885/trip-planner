/**
 * GET /api/trips/[id]/gcal/status
 *
 * v2.9.0 호환 어댑터 — TripCalendarLink가 존재하면 그것을 정본으로 사용한다.
 *
 * v2.8.0 per-user GCalLink로의 폴백은 #393에서 제거했다. 이유:
 *   backfill_v28_gcal_links가 "오너 DEDICATED"만 승격하므로, 오너 PRIMARY·미연결 트립에서는
 *   비오너의 per-user 링크가 남아 폴백이 `linked:true`를 돌려주는데,
 *   UI는 이를 근거로 v2 subscribe/sync 버튼을 그리고 실제 호출은 not_linked 404로 떨어졌다.
 *   이제 TripCalendarLink가 없으면 항상 linked:false. 레거시 GCalLink가 감지되면
 *   `legacy: "needs_owner_relink"`로 안내해 오너의 재연결을 유도한다.
 *
 * 공유 여행에서 타 멤버의 연동 상태는 본 응답에 포함되지 않는다(FR-007).
 */

import { NextRequest, NextResponse } from "next/server";
import { TripRole } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTripMember } from "@/lib/auth-helpers";
import { hasCalendarScope } from "@/lib/gcal/auth";
import type { GCalLastError, StatusResponse } from "@/types/gcal";

function normalizeLastError(raw: string | null): GCalLastError {
  if (!raw) return null;
  if (raw === "REVOKED" || raw === "RATE_LIMITED" || raw === "NETWORK" || raw === "UNKNOWN") {
    return raw;
  }
  return "UNKNOWN";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<StatusResponse | { error: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const tripId = Number((await params).id);
  if (!Number.isFinite(tripId)) {
    return NextResponse.json({ error: "bad_trip_id" }, { status: 400 });
  }

  const member = await getTripMember(tripId, session.user.id);
  if (!member) {
    return NextResponse.json({ error: "not_a_member" }, { status: 403 });
  }

  // v2.9.0: TripCalendarLink가 존재하면 그걸 응답 정본으로 사용.
  const sharedLink = await prisma.tripCalendarLink.findUnique({ where: { tripId } });
  if (sharedLink) {
    // 비-오너 멤버의 본인 subscription 상태를 함께 반환해 UI가 역할·상태별 카드를 렌더할 수 있게 함.
    type MySubscription =
      | { status: "NOT_ADDED" | "ADDED" | "ERROR"; lastError: string | null }
      | null;
    let mySubscription: MySubscription = null;
    if (member.role !== TripRole.OWNER) {
      const sub = await prisma.memberCalendarSubscription.findUnique({
        where: { linkId_userId: { linkId: sharedLink.id, userId: session.user.id } },
      });
      mySubscription = sub
        ? { status: sub.status, lastError: sub.lastError ?? null }
        : { status: "NOT_ADDED", lastError: null };
    }
    const body: StatusResponse = {
      linked: true,
      link: {
        calendarType: "DEDICATED",
        calendarId: sharedLink.calendarId,
        calendarName: sharedLink.calendarName,
        lastSyncedAt: sharedLink.lastSyncedAt?.toISOString() ?? null,
        lastError: normalizeLastError(sharedLink.lastError),
        skippedCount: sharedLink.skippedCount,
      },
      mySubscription,
    };
    return NextResponse.json(body);
  }

  // TripCalendarLink가 없는 트립에서 레거시 per-user GCalLink가 남아있는지만 검사한다.
  // 존재 시 미연결 상태로 응답하되 legacy 힌트를 실어 UI가 오너에게 재연결을 유도한다.
  // #393: 폴백으로 linked:true를 돌려주지 않는다 — v2 subscribe/sync가 not_linked 404로
  // 떨어지던 문제의 원인이었다.
  const legacyLink = await prisma.gCalLink.findFirst({
    where: { tripId },
    select: { id: true },
  });
  const scopeGranted = await hasCalendarScope(session.user.id);
  return NextResponse.json({
    linked: false,
    scopeGranted,
    ...(legacyLink ? { legacy: "needs_owner_relink" as const } : {}),
  } satisfies StatusResponse);
}
