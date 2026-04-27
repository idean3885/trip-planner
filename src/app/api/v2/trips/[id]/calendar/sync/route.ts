/**
 * v2 per-trip 공유 캘린더 sync 엔드포인트 (#349, spec 019, sub-issue #359).
 *
 * POST /api/v2/trips/[id]/calendar/sync — 오너·HOST가 여행의 활동을 공유 캘린더에 반영.
 *
 * spec 024 (#416) — 비즈니스 로직은 src/lib/calendar/service.ts::syncCalendar에 위임.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAppOrigin } from "@/lib/app-url";
import { syncCalendar } from "@/lib/calendar/service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const tripId = Number((await params).id);
  if (!Number.isFinite(tripId)) {
    return NextResponse.json({ error: "bad_trip_id" }, { status: 400 });
  }

  const tripUrl = `${getAppOrigin(req)}/trips/${tripId}`;
  const result = await syncCalendar(
    { userId: session.user.id, tripId },
    { tripUrl },
  );
  return NextResponse.json(result.body, { status: result.status });
}
