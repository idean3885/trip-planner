/**
 * v2 per-trip 공유 캘린더 sync 엔드포인트 (#349, spec 019, sub-issue #359).
 *
 * POST /api/v2/trips/[id]/calendar/sync — 오너가 여행의 활동을 공유 캘린더에 반영.
 *
 * 전략:
 *  - TripCalendarLink의 calendarId를 정본으로 사용
 *  - 이벤트 매핑은 v2.9.0 expand 단계에서 기존 GCalEventMapping(GCalLink 기반)을 재활용
 *    (contract 릴리즈에서 TripCalendarEventMapping으로 이관 예정)
 *  - 오너의 GCalLink가 없으면 bridge GCalLink를 동적으로 생성해 이벤트 매핑 추적 시작
 */

import { NextRequest, NextResponse } from "next/server";
import { TripRole } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTripMember } from "@/lib/auth-helpers";
import { getAppOrigin } from "@/lib/app-url";
import {
  buildConsentRedirectUrl,
  hasCalendarScope,
} from "@/lib/gcal/auth";
import { getCalendarClient, classifyError } from "@/lib/gcal/client";
import { syncActivities } from "@/lib/gcal/sync";
import type { ConsentRequired, SyncResponse, GCalLastError } from "@/types/gcal";

function normalizeLastError(raw: string | null): GCalLastError {
  if (!raw) return null;
  if (raw === "REVOKED" || raw === "RATE_LIMITED" || raw === "NETWORK" || raw === "UNKNOWN") {
    return raw;
  }
  return "UNKNOWN";
}

function inferLastError(result: { failed: { reason: string }[] }): GCalLastError {
  if (!result.failed.length) return null;
  const r = result.failed[0].reason;
  if (r === "forbidden") return "REVOKED";
  if (r === "rate_limited") return "RATE_LIMITED";
  if (r === "network") return "NETWORK";
  return "UNKNOWN";
}

export async function POST(
  req: NextRequest,
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

  // 오너만 sync 가능.
  const member = await getTripMember(tripId, session.user.id);
  if (member?.role !== TripRole.OWNER) {
    return NextResponse.json({ error: "owner_only" }, { status: 403 });
  }

  if (!(await hasCalendarScope(session.user.id))) {
    const body: ConsentRequired = {
      error: "consent_required",
      authorizationUrl: buildConsentRedirectUrl(`/trips/${tripId}?gcal=synced`),
    };
    return NextResponse.json(body, { status: 409 });
  }

  const link = await prisma.tripCalendarLink.findUnique({ where: { tripId } });
  if (!link) {
    return NextResponse.json({ error: "not_linked" }, { status: 404 });
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true, title: true },
  });
  if (!trip) {
    return NextResponse.json({ error: "trip_not_found" }, { status: 404 });
  }

  const client = await getCalendarClient(session.user.id);
  if (!client) {
    return NextResponse.json({ error: "no_google_account" }, { status: 409 });
  }

  // 이벤트 매핑은 기존 GCalLink 기반 재활용. 없으면 bridge 생성(신규 v2.9.0 트립).
  let bridgeLink = await prisma.gCalLink.findUnique({
    where: { userId_tripId: { userId: link.ownerId, tripId } },
  });
  if (!bridgeLink) {
    bridgeLink = await prisma.gCalLink.create({
      data: {
        userId: link.ownerId,
        tripId,
        calendarId: link.calendarId,
        calendarType: "DEDICATED",
        calendarName: link.calendarName,
      },
    });
  }

  const tripUrl = `${getAppOrigin(req)}/trips/${tripId}`;
  let result;
  try {
    result = await syncActivities(client, {
      linkId: bridgeLink.id,
      calendarId: link.calendarId,
      trip,
      tripUrl,
    });
  } catch (err) {
    const { reason } = classifyError(err);
    return NextResponse.json({ error: "sync_failed", reason }, { status: 502 });
  }

  const hasFailure = result.failed.length > 0;
  const status = hasFailure
    ? result.created + result.updated + result.deleted > 0 || result.skipped > 0
      ? "partial"
      : "failed"
    : "ok";

  const updatedLink = await prisma.tripCalendarLink.update({
    where: { id: link.id },
    data: {
      lastSyncedAt: new Date(),
      skippedCount: { increment: result.skipped },
      lastError: hasFailure ? inferLastError(result) : null,
    },
  });
  // bridgeLink의 메타도 함께 업데이트 (레거시 상태 응답 일관성용)
  await prisma.gCalLink.update({
    where: { id: bridgeLink.id },
    data: {
      lastSyncedAt: new Date(),
      skippedCount: { increment: result.skipped },
      lastError: hasFailure ? inferLastError(result) : null,
    },
  });

  const body: SyncResponse = {
    status,
    summary: {
      created: result.created,
      updated: result.updated,
      deleted: result.deleted,
      skipped: result.skipped,
      failed: result.failed.length,
    },
    failed: result.failed,
    link: {
      calendarType: "DEDICATED",
      calendarId: updatedLink.calendarId,
      calendarName: updatedLink.calendarName,
      lastSyncedAt: updatedLink.lastSyncedAt?.toISOString() ?? null,
      lastError: normalizeLastError(updatedLink.lastError),
      skippedCount: updatedLink.skippedCount,
    },
  };
  return NextResponse.json(body);
}
