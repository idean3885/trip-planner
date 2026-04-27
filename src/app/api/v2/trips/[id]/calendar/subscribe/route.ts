/**
 * 멤버 수동 subscribe 엔드포인트 (#349, spec 019, sub-issue #358).
 *
 * POST   /api/v2/trips/[id]/calendar/subscribe — 본인 Google CalendarList에 추가
 * DELETE /api/v2/trips/[id]/calendar/subscribe — 본인 CalendarList에서 제거 (ACL은 유지)
 *
 * spec 024 (#416) — 비즈니스 로직은 src/lib/calendar/service.ts::subscribeCalendar/
 * unsubscribeCalendar에 위임.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  subscribeCalendar,
  unsubscribeCalendar,
} from "@/lib/calendar/service";

async function authenticate(params: Promise<{ id: string }>) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) } as const;
  }
  const tripId = Number((await params).id);
  if (!Number.isFinite(tripId)) {
    return { error: NextResponse.json({ error: "bad_trip_id" }, { status: 400 }) } as const;
  }
  return { userId: session.user.id, tripId } as const;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const a = await authenticate(params);
  if ("error" in a) return a.error;

  const result = await subscribeCalendar({ userId: a.userId, tripId: a.tripId });
  return NextResponse.json(result.body, { status: result.status });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const a = await authenticate(params);
  if ("error" in a) return a.error;

  const result = await unsubscribeCalendar({ userId: a.userId, tripId: a.tripId });
  return NextResponse.json(result.body, { status: result.status });
}
