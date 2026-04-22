/**
 * PATCH /api/trips/[id]/gcal/sync — 본인 GCalLink 범위에서 활동 diff를 재반영.
 * retryOnly 배열이 주어지면 그 활동들만 재시도.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTripMember } from "@/lib/auth-helpers";
import { getAppOrigin } from "@/lib/app-url";
import { buildConsentRedirectUrl, hasCalendarScope } from "@/lib/gcal/auth";
import { getCalendarClient } from "@/lib/gcal/client";
import { syncActivities } from "@/lib/gcal/sync";
import type {
  ConsentRequired,
  GCalLastError,
  SyncResponse,
} from "@/types/gcal";

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

export async function PATCH(
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

  const member = await getTripMember(tripId, session.user.id);
  if (!member) {
    return NextResponse.json({ error: "not_a_member" }, { status: 403 });
  }

  const link = await prisma.gCalLink.findUnique({
    where: { userId_tripId: { userId: session.user.id, tripId } },
    include: { trip: { select: { id: true, title: true } } },
  });
  if (!link) {
    return NextResponse.json({ error: "not_linked" }, { status: 404 });
  }

  if (!(await hasCalendarScope(session.user.id))) {
    const body: ConsentRequired = {
      error: "consent_required",
      authorizationUrl: buildConsentRedirectUrl(`/trips/${tripId}?gcal=sync-ready`),
    };
    return NextResponse.json(body, { status: 409 });
  }

  const client = await getCalendarClient(session.user.id);
  if (!client) {
    return NextResponse.json({ error: "no_google_account" }, { status: 409 });
  }

  const payload = (await req.json().catch(() => ({}))) as { retryOnly?: number[] };
  const tripUrl = `${getAppOrigin(req)}/trips/${tripId}`;

  const result = await syncActivities(
    client,
    { linkId: link.id, calendarId: link.calendarId, trip: link.trip, tripUrl },
    { retryOnly: Array.isArray(payload.retryOnly) ? payload.retryOnly : undefined }
  );

  const hasFailure = result.failed.length > 0;
  const status = hasFailure
    ? result.created + result.updated + result.deleted > 0 || result.skipped > 0
      ? "partial"
      : "failed"
    : "ok";

  // skippedCount는 이번 sync의 건너뛴 이벤트 수로 set (매 호출마다 누적되지 않도록).
  const updated = await prisma.gCalLink.update({
    where: { id: link.id },
    data: {
      lastSyncedAt: new Date(),
      skippedCount: result.skipped,
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
      calendarType: updated.calendarType,
      calendarId: updated.calendarId,
      calendarName: updated.calendarName,
      lastSyncedAt: updated.lastSyncedAt?.toISOString() ?? null,
      lastError: normalizeLastError(updated.lastError),
      skippedCount: updated.skippedCount,
    },
  };
  return NextResponse.json(body);
}
