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
import { upsertAcl, mapRoleToAcl } from "@/lib/gcal/acl";
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

  // OWNER·HOST 모두 sync 트리거 가능. GUEST는 편집 권한 없어 불가.
  // Google API는 항상 링크 오너의 토큰으로 실행된다(이벤트 데이터 오너 = 트립 오너).
  const member = await getTripMember(tripId, session.user.id);
  if (!member || (member.role !== TripRole.OWNER && member.role !== TripRole.HOST)) {
    return NextResponse.json({ error: "editor_only" }, { status: 403 });
  }

  const link = await prisma.tripCalendarLink.findUnique({ where: { tripId } });
  if (!link) {
    return NextResponse.json({ error: "not_linked" }, { status: 404 });
  }

  // 오너가 직접 sync할 때만 본인 scope 점검. 호스트는 오너 토큰 경유라 본인 scope 무관.
  if (member.role === TripRole.OWNER && !(await hasCalendarScope(session.user.id))) {
    const body: ConsentRequired = {
      error: "consent_required",
      authorizationUrl: buildConsentRedirectUrl(`/trips/${tripId}?gcal=synced`),
    };
    return NextResponse.json(body, { status: 409 });
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true, title: true },
  });
  if (!trip) {
    return NextResponse.json({ error: "trip_not_found" }, { status: 404 });
  }

  // 항상 링크 오너 토큰으로 Google API 호출.
  const client = await getCalendarClient(link.ownerId);
  if (!client) {
    return NextResponse.json({ error: "owner_token_unavailable" }, { status: 502 });
  }

  // 현재 멤버 전원에게 ACL 재부여 (idempotent). v2.8.0 → v2.9.0 마이그레이션으로 승격된
  // 트립은 DB 레코드만 존재하고 Google 쪽 ACL이 부여되지 않은 상태라, 오너가 sync를
  // 실행할 때 ACL 부여를 함께 복구한다. 오너 본인은 Google이 자동 owner 데이터 오너로
  // 인식하므로 대상 아님. 실패는 로그만 남기고 sync 자체는 계속 진행.
  const members = await prisma.tripMember.findMany({
    where: { tripId, NOT: { role: TripRole.OWNER } },
    include: { user: { select: { email: true } } },
  });
  for (const m of members) {
    if (!m.user.email) continue;
    const aclResult = await upsertAcl(client.calendar, {
      calendarId: link.calendarId,
      email: m.user.email,
      role: mapRoleToAcl(m.role),
    });
    if (!aclResult.ok) {
      console.warn(
        `[gcal] sync-time ACL upsert failed tripId=${tripId} userId=${m.userId} reason=${aclResult.reason}`
      );
    }
  }

  // spec 022(v2.10.0): 이벤트 매핑을 공유 캘린더에 직접 귀속. 기존 bridge GCalLink
  // 동적 생성·재사용 로직은 제거. 레거시 GCalLink 테이블은 남아 있으나 활성 코드
  // 경로에서 참조하지 않는다(후속 v2.11.0+ contract에서 drop).
  const tripUrl = `${getAppOrigin(req)}/trips/${tripId}`;
  let result;
  try {
    result = await syncActivities(client, {
      tripCalendarLinkId: link.id,
      calendarId: link.calendarId,
      trip,
      tripUrl,
    });
  } catch (err) {
    const { reason } = classifyError(err);
    // spec 021: Testing 모드 제약 사용자(주인)에게 sync가 거부되면 UI 안내 카드로 분기.
    if (reason === "unregistered") {
      return NextResponse.json(
        { error: "unregistered", reason },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: "sync_failed", reason }, { status: 502 });
  }

  const hasFailure = result.failed.length > 0;
  const status = hasFailure
    ? result.created + result.updated + result.deleted > 0 || result.skipped > 0
      ? "partial"
      : "failed"
    : "ok";

  // skippedCount는 "이번 sync에서 사용자가 직접 수정한 이벤트 수"를 표시한다.
  // 매 sync마다 set(덮어쓰기)로 갱신해 누적되지 않도록 한다. 이전 동작(increment)은
  // 동일 이벤트가 매 호출마다 다시 카운트되어 숫자가 선형 증가하는 문제가 있었다.
  const updatedLink = await prisma.tripCalendarLink.update({
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
