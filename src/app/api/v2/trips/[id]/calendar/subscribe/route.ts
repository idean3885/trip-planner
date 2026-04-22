/**
 * 멤버 수동 subscribe 엔드포인트 (#349, spec 019, sub-issue #358).
 *
 * POST   /api/v2/trips/[id]/calendar/subscribe — 본인 Google CalendarList에 추가
 * DELETE /api/v2/trips/[id]/calendar/subscribe — 본인 CalendarList에서 제거 (ACL은 유지)
 *
 * 설계:
 *  - 본인 OAuth 토큰으로 호출 (타 멤버 토큰 사용 금지)
 *  - calendar scope 없으면 409 + consent URL 반환. 멤버가 동의 후 재호출
 *  - subscription 상태는 DB(MemberCalendarSubscription)에 기록
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTripMember } from "@/lib/auth-helpers";
import { buildConsentRedirectUrl, hasCalendarScope } from "@/lib/gcal/auth";
import { getCalendarClient, classifyError, getStatus } from "@/lib/gcal/client";
import type { MemberSubscribeResponse, ConsentRequired } from "@/types/gcal";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const link = await prisma.tripCalendarLink.findUnique({ where: { tripId } });
  if (!link) {
    return NextResponse.json({ error: "not_linked" }, { status: 404 });
  }

  // scope 없으면 동의 요구. 멤버가 동의 후 같은 경로로 재호출.
  if (!(await hasCalendarScope(session.user.id))) {
    const body: ConsentRequired & { error: "consent_required" } = {
      error: "consent_required",
      authorizationUrl: buildConsentRedirectUrl(`/trips/${tripId}?gcal=subscribed`),
    };
    return NextResponse.json(body, { status: 409 });
  }

  const client = await getCalendarClient(session.user.id);
  if (!client) {
    return NextResponse.json({ error: "no_google_account" }, { status: 409 });
  }

  try {
    const res = await client.calendar.calendarList.insert({
      requestBody: { id: link.calendarId },
    });
    const subscription = await prisma.memberCalendarSubscription.upsert({
      where: { linkId_userId: { linkId: link.id, userId: session.user.id } },
      create: {
        linkId: link.id,
        userId: session.user.id,
        status: "ADDED",
        lastError: null,
      },
      update: { status: "ADDED", lastError: null },
    });
    const body: MemberSubscribeResponse = {
      status: "ok",
      subscription: {
        tripId,
        status: subscription.status,
        accessRole: res.data.accessRole ?? null,
        lastError: null,
      },
    };
    return NextResponse.json(body);
  } catch (err) {
    const status = getStatus(err);
    const { reason } = classifyError(err);
    await prisma.memberCalendarSubscription.upsert({
      where: { linkId_userId: { linkId: link.id, userId: session.user.id } },
      create: {
        linkId: link.id,
        userId: session.user.id,
        status: "ERROR",
        lastError: reason,
      },
      update: { status: "ERROR", lastError: reason },
    });
    const body: MemberSubscribeResponse = { status: "failed", error: reason };
    return NextResponse.json(body, { status: status >= 400 ? status : 502 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const link = await prisma.tripCalendarLink.findUnique({ where: { tripId } });
  if (!link) {
    return NextResponse.json({ error: "not_linked" }, { status: 404 });
  }

  const client = await getCalendarClient(session.user.id);
  if (client) {
    // 본인 CalendarList에서 제거만 시도. ACL은 유지(다시 subscribe 가능).
    try {
      await client.calendar.calendarList.delete({ calendarId: link.calendarId });
    } catch (err) {
      // 404는 "이미 없음"이므로 성공 간주. 그 외는 로그만 남기고 진행.
      if (getStatus(err) !== 404) {
        console.warn(
          `[gcal] calendarList.delete failed userId=${session.user.id} tripId=${tripId}`,
          err instanceof Error ? err.message : err
        );
      }
    }
  }

  await prisma.memberCalendarSubscription.upsert({
    where: { linkId_userId: { linkId: link.id, userId: session.user.id } },
    create: {
      linkId: link.id,
      userId: session.user.id,
      status: "NOT_ADDED",
      lastError: null,
    },
    update: { status: "NOT_ADDED", lastError: null },
  });

  return NextResponse.json({ status: "ok" });
}
