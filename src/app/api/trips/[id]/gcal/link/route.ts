/**
 * POST /api/trips/[id]/gcal/link — 여행을 본인 구글 캘린더에 연결하고 초기 동기화.
 * DELETE /api/trips/[id]/gcal/link — 연결 해제 + 이벤트 삭제(사용자 수정분은 보존).
 */

import { NextRequest, NextResponse } from "next/server";
import type { GCalCalendarType } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTripMember } from "@/lib/auth-helpers";
import { getAppOrigin } from "@/lib/app-url";
import {
  buildConsentRedirectUrl,
  hasCalendarScope,
} from "@/lib/gcal/auth";
import { getCalendarClient, classifyError } from "@/lib/gcal/client";
import { dedicatedCalendarName } from "@/lib/gcal/format";
import { syncActivities, unlinkEvents } from "@/lib/gcal/sync";
import type {
  ConsentRequired,
  GCalLastError,
  SyncResponse,
  UnlinkResponse,
} from "@/types/gcal";

interface LinkBody {
  calendarType: GCalCalendarType;
}

function normalizeLastError(raw: string | null): GCalLastError {
  if (!raw) return null;
  if (raw === "REVOKED" || raw === "RATE_LIMITED" || raw === "NETWORK" || raw === "UNKNOWN") {
    return raw;
  }
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

  const member = await getTripMember(tripId, session.user.id);
  if (!member) {
    return NextResponse.json({ error: "not_a_member" }, { status: 403 });
  }

  // 1) scope 확인. 없으면 동의 진입 URL 반환.
  if (!(await hasCalendarScope(session.user.id))) {
    const body: ConsentRequired = {
      error: "consent_required",
      authorizationUrl: buildConsentRedirectUrl(`/trips/${tripId}?gcal=link-ready`),
    };
    return NextResponse.json(body, { status: 409 });
  }

  // 2) 입력 파싱
  const payload = (await req.json().catch(() => ({}))) as Partial<LinkBody>;
  const calendarType: GCalCalendarType =
    payload.calendarType === "PRIMARY" ? "PRIMARY" : "DEDICATED";

  // 3) 여행 메타 조회
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true, title: true },
  });
  if (!trip) {
    return NextResponse.json({ error: "trip_not_found" }, { status: 404 });
  }

  // 4) Calendar 클라이언트
  const client = await getCalendarClient(session.user.id);
  if (!client) {
    return NextResponse.json({ error: "no_google_account" }, { status: 409 });
  }

  // 5) calendarId 결정 (전용 캘린더면 생성)
  let calendarId: string;
  let calendarName: string | null = null;
  if (calendarType === "PRIMARY") {
    calendarId = "primary";
  } else {
    try {
      const res = await client.calendar.calendars.insert({
        requestBody: { summary: dedicatedCalendarName(trip.title) },
      });
      calendarId = res.data.id ?? "primary";
      calendarName = res.data.summary ?? dedicatedCalendarName(trip.title);
    } catch (err) {
      const { reason } = classifyError(err);
      return NextResponse.json(
        { error: "calendar_create_failed", reason },
        { status: 502 }
      );
    }
  }

  // 6) GCalLink upsert
  const link = await prisma.gCalLink.upsert({
    where: { userId_tripId: { userId: session.user.id, tripId } },
    create: {
      userId: session.user.id,
      tripId,
      calendarId,
      calendarType,
      calendarName,
    },
    update: { calendarId, calendarType, calendarName, lastError: null },
  });

  // 7) 초기 동기화
  const tripUrl = `${getAppOrigin(req)}/trips/${tripId}`;
  const result = await syncActivities(client, {
    linkId: link.id,
    calendarId,
    trip,
    tripUrl,
  });

  const hasFailure = result.failed.length > 0;
  const status = hasFailure
    ? result.created + result.updated + result.deleted > 0 || result.skipped > 0
      ? "partial"
      : "failed"
    : "ok";

  // skippedCount는 이번 호출의 건너뛴 이벤트 수로 set (누적 방지, 이전 increment 버그 수정).
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

  const link = await prisma.gCalLink.findUnique({
    where: { userId_tripId: { userId: session.user.id, tripId } },
  });
  if (!link) {
    return NextResponse.json({ error: "not_linked" }, { status: 404 });
  }

  const client = await getCalendarClient(session.user.id);
  if (!client) {
    // 토큰이 없어도 DB 레코드 정리는 가능. 단, 이벤트 삭제 책임은 Google에.
    await prisma.gCalLink.delete({ where: { id: link.id } });
    return NextResponse.json<UnlinkResponse>({
      status: "partial",
      summary: { deleted: 0, skipped: 0, failed: 0 },
      failed: [],
    });
  }

  const res = await unlinkEvents(client, {
    linkId: link.id,
    calendarId: link.calendarId,
  });
  await prisma.gCalLink.delete({ where: { id: link.id } });

  const body: UnlinkResponse = {
    status: res.failed.length ? "partial" : "ok",
    summary: { deleted: res.deleted, skipped: res.skipped, failed: res.failed.length },
    failed: res.failed,
  };
  return NextResponse.json(body);
}

function inferLastError(result: { failed: { reason: string }[] }): GCalLastError {
  if (!result.failed.length) return null;
  const r = result.failed[0].reason;
  if (r === "forbidden") return "REVOKED";
  if (r === "rate_limited") return "RATE_LIMITED";
  if (r === "network") return "NETWORK";
  return "UNKNOWN";
}
