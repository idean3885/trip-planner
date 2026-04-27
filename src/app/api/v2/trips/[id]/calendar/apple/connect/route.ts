/**
 * spec 025 (#417) — Apple iCloud 공유 캘린더 연결.
 *
 * POST /api/v2/trips/[id]/calendar/apple/connect
 *
 * 사전 조건: validate 라우트로 AppleCalendarCredential 저장 완료.
 * 흐름: service.connectAppleCalendar 위임. capability "manual"로 멤버 ACL 자동 부여 0회 +
 * `manualAclGuidance` 응답 포함.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectAppleCalendar } from "@/lib/calendar/service";

export async function POST(
  _req: NextRequest,
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

  const result = await connectAppleCalendar({ userId: session.user.id, tripId });
  return NextResponse.json(result.body, { status: result.status });
}
