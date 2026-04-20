/**
 * GET /api/trips/[id]/gcal/status
 *
 * 현재 사용자의 이 여행에 대한 GCal 연동 상태를 돌려준다.
 * 공유 여행에서 타 멤버의 연동 상태는 본 응답에 포함되지 않는다(FR-007).
 */

import { NextRequest, NextResponse } from "next/server";
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

  // 본인(Self) 링크만 조회 — 타 멤버의 GCalLink는 응답에 포함하지 않는다.
  const link = await prisma.gCalLink.findUnique({
    where: { userId_tripId: { userId: session.user.id, tripId } },
  });

  if (link) {
    const body: StatusResponse = {
      linked: true,
      link: {
        calendarType: link.calendarType,
        calendarId: link.calendarId,
        calendarName: link.calendarName,
        lastSyncedAt: link.lastSyncedAt?.toISOString() ?? null,
        lastError: normalizeLastError(link.lastError),
        skippedCount: link.skippedCount,
      },
    };
    return NextResponse.json(body);
  }

  const scopeGranted = await hasCalendarScope(session.user.id);
  return NextResponse.json({ linked: false, scopeGranted } satisfies StatusResponse);
}
