/**
 * v2 per-trip 공유 캘린더 API (#349, spec 019).
 *
 * POST   /api/v2/trips/[id]/calendar — 오너가 공유 캘린더 연결 (생성 또는 채택) + 현재 멤버 전원 ACL 자동 부여
 * DELETE /api/v2/trips/[id]/calendar — 오너가 연결 해제 (ACL 회수는 시도만, 캘린더 자체는 Google에 유지)
 * GET    /api/v2/trips/[id]/calendar — 현재 사용자 시점의 연결 상태 (오너는 전체 ACL, 멤버는 본인 subscription만)
 *
 * spec 024 (#416) — 비즈니스 로직은 src/lib/calendar/service.ts에 위임. 본 라우트는
 * session 인증·tripId 파싱 + service 결과를 NextResponse로 변환만 한다.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  connectCalendar,
  disconnectCalendar,
  getCalendarStatus,
} from "@/lib/calendar/service";

async function authenticate(req: NextRequest, params: Promise<{ id: string }>) {
  void req;
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
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const a = await authenticate(req, params);
  if ("error" in a) return a.error;

  const result = await connectCalendar({ userId: a.userId, tripId: a.tripId });
  return NextResponse.json(result.body, { status: result.status });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const a = await authenticate(req, params);
  if ("error" in a) return a.error;

  const result = await disconnectCalendar({ userId: a.userId, tripId: a.tripId });
  return NextResponse.json(result.body, { status: result.status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const a = await authenticate(req, params);
  if ("error" in a) return a.error;

  const result = await getCalendarStatus({ userId: a.userId, tripId: a.tripId });
  return NextResponse.json(result.body, { status: result.status });
}
