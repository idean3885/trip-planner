/**
 * GET /api/trips/[id]/gcal/status
 *
 * TripCalendarLink만 "연결됨/미연결"의 정본이다. per-user GCalLink는 v2.9.0 이후
 * 정본이 아니므로 폴백 조회하지 않는다(spec 020, Clarification Session 2026-04-22).
 *
 * 과거에는 TripCalendarLink 부재 시 본인 per-user GCalLink로 폴백해 linked:true를
 * 돌려주었으나, 이는 주인이 아직 공유 캘린더를 연결하지 않은 여행에서 호스트·게스트
 * UI가 v2 subscribe/sync 버튼을 그리게 해 404 not_linked를 유발했다. 본 피처에서
 * 폴백을 해제하고 TripCalendarLink 부재 = linked:false로 정본화한다.
 *
 * 공유 여행에서 타 동행자의 연동 상태는 본 응답에 포함되지 않는다(FR-007, spec 018).
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
    // 비-주인 동행자의 본인 subscription 상태를 함께 반환해 UI가 역할·상태별 카드를 렌더할 수 있게 함.
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

  // TripCalendarLink가 없으면 "미연결" — per-user GCalLink 폴백은 하지 않는다(spec 020).
  const scopeGranted = await hasCalendarScope(session.user.id);
  return NextResponse.json({ linked: false, scopeGranted } satisfies StatusResponse);
}
