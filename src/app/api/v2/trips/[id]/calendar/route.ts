/**
 * v2 per-trip 공유 캘린더 API (#349, spec 019).
 *
 * POST   /api/v2/trips/[id]/calendar — 오너가 공유 캘린더 연결 (생성 또는 채택) + 현재 멤버 전원 ACL 자동 부여
 * DELETE /api/v2/trips/[id]/calendar — 오너가 연결 해제 (ACL 회수는 시도만, 캘린더 자체는 Google에 유지)
 * GET    /api/v2/trips/[id]/calendar — 현재 사용자 시점의 연결 상태 (오너는 전체 ACL, 멤버는 본인 subscription만)
 */

import { NextRequest, NextResponse } from "next/server";
import { TripRole, type TripMember, type User } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTripMember } from "@/lib/auth-helpers";
import {
  buildConsentRedirectUrl,
  hasCalendarScope,
} from "@/lib/gcal/auth";
import { getCalendarClient, classifyError } from "@/lib/gcal/client";
import { dedicatedCalendarName } from "@/lib/gcal/format";
import {
  upsertAcl,
  deleteAcl,
  mapRoleToAcl,
  type AclUpsertResult,
} from "@/lib/gcal/acl";
import type {
  ConsentRequired,
  MemberAclState,
  TripCalendarLinkResponse,
  TripCalendarLinkState,
  TripCalendarLastError,
} from "@/types/gcal";

function normalizeLastError(raw: string | null): TripCalendarLastError {
  if (!raw) return null;
  if (raw === "REVOKED" || raw === "RATE_LIMITED" || raw === "NETWORK" || raw === "UNKNOWN") {
    return raw;
  }
  return "UNKNOWN";
}

function toMemberAclState(
  m: TripMember & { user: Pick<User, "id" | "email"> },
  aclResult: AclUpsertResult | undefined
): MemberAclState {
  return {
    userId: m.userId,
    email: m.user.email ?? "",
    role: m.role,
    aclRole: mapRoleToAcl(m.role),
    aclStatus: aclResult?.ok ? "granted" : "failed",
    aclError: aclResult?.ok ? undefined : (aclResult?.reason as MemberAclState["aclError"]),
  };
}

async function loadMembersWithEmails(tripId: number) {
  return prisma.tripMember.findMany({
    where: { tripId },
    include: { user: { select: { id: true, email: true } } },
  });
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

  // 오너만 공유 캘린더를 생성·연결할 수 있다.
  const member = await getTripMember(tripId, session.user.id);
  if (!member) {
    return NextResponse.json({ error: "not_a_member" }, { status: 403 });
  }
  if (member.role !== TripRole.OWNER) {
    return NextResponse.json({ error: "owner_only" }, { status: 403 });
  }

  // Calendar scope 필요.
  if (!(await hasCalendarScope(session.user.id))) {
    const body: ConsentRequired = {
      error: "consent_required",
      authorizationUrl: buildConsentRedirectUrl(`/trips/${tripId}?gcal=link-ready`),
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

  const client = await getCalendarClient(session.user.id);
  if (!client) {
    return NextResponse.json({ error: "no_google_account" }, { status: 409 });
  }

  // 기존 링크가 있으면 그대로 재사용. 없으면 신규 생성.
  let link = await prisma.tripCalendarLink.findUnique({
    where: { tripId },
  });

  if (!link) {
    let calendarId: string;
    let calendarName: string;
    try {
      const res = await client.calendar.calendars.insert({
        requestBody: { summary: dedicatedCalendarName(trip.title) },
      });
      calendarId = res.data.id ?? "";
      calendarName = res.data.summary ?? dedicatedCalendarName(trip.title);
      if (!calendarId) throw new Error("empty calendar id from insert");
    } catch (err) {
      const { reason } = classifyError(err);
      // spec 021: Testing 모드 제약으로 미등록 사용자가 캘린더 생성을 거부당한 경우
      // UI가 안내 카드로 분기할 수 있도록 error 키에 직접 노출한다.
      if (reason === "unregistered") {
        return NextResponse.json(
          { error: "unregistered", reason },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: "calendar_create_failed", reason },
        { status: 502 }
      );
    }
    link = await prisma.tripCalendarLink.create({
      data: {
        tripId,
        ownerId: session.user.id,
        calendarId,
        calendarName,
      },
    });
  }

  // 현재 멤버 전원에게 ACL 자동 부여. 오너 자신은 Google이 이미 owner 데이터 오너로
  // 간주하므로 별도 ACL 삽입 불필요(insert 시도해도 idempotent지만 scope 불필요 메시지만 더함).
  const members = await loadMembersWithEmails(tripId);
  const results = new Map<string, AclUpsertResult>();
  for (const m of members) {
    if (m.role === TripRole.OWNER) continue;
    if (!m.user.email) continue;
    const result = await upsertAcl(client.calendar, {
      calendarId: link.calendarId,
      email: m.user.email,
      role: mapRoleToAcl(m.role),
    });
    results.set(m.userId, result);
  }

  const anyFailed = Array.from(results.values()).some((r) => !r.ok);
  const body: TripCalendarLinkResponse = {
    status: anyFailed ? "partial" : "ok",
    link: toLinkState(link),
    members: members.map((m) => toMemberAclState(m, results.get(m.userId))),
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

  const member = await getTripMember(tripId, session.user.id);
  if (member?.role !== TripRole.OWNER) {
    return NextResponse.json({ error: "owner_only" }, { status: 403 });
  }

  const link = await prisma.tripCalendarLink.findUnique({
    where: { tripId },
  });
  if (!link) {
    return NextResponse.json({ error: "not_linked" }, { status: 404 });
  }

  const client = await getCalendarClient(session.user.id);
  if (client) {
    // 멤버 ACL 회수 시도. 실패는 기록만 하고 계속 진행(DB 레코드 정리는 확실히 수행).
    const members = await loadMembersWithEmails(tripId);
    for (const m of members) {
      if (m.role === TripRole.OWNER) continue;
      if (!m.user.email) continue;
      await deleteAcl(client.calendar, {
        calendarId: link.calendarId,
        email: m.user.email,
      });
    }
  }

  // 캘린더 자체는 Google에 남겨둔다 (사용자 데이터 보존 원칙).
  // MemberCalendarSubscription은 cascade로 함께 제거.
  await prisma.tripCalendarLink.delete({ where: { id: link.id } });

  return NextResponse.json({ status: "ok" });
}

export async function GET(
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

  const link = await prisma.tripCalendarLink.findUnique({
    where: { tripId },
  });
  if (!link) {
    const scopeGranted = await hasCalendarScope(session.user.id);
    return NextResponse.json({ linked: false, scopeGranted });
  }

  // 오너는 전체 ACL 상태까지. 일반 멤버는 본인 subscription 상태만.
  if (member.role === TripRole.OWNER) {
    const members = await loadMembersWithEmails(tripId);
    return NextResponse.json({
      linked: true,
      link: toLinkState(link),
      members: members.map((m) => ({
        userId: m.userId,
        email: m.user.email ?? "",
        role: m.role,
        aclRole: mapRoleToAcl(m.role),
        aclStatus: "granted", // 본 엔드포인트는 조회만. 실제 상태는 subscribe 엔드포인트 결과로 갱신
      })),
    });
  }

  const subscription = await prisma.memberCalendarSubscription.findUnique({
    where: { linkId_userId: { linkId: link.id, userId: session.user.id } },
  });
  return NextResponse.json({
    linked: true,
    link: toLinkState(link),
    subscription: subscription
      ? {
          tripId,
          status: subscription.status,
          accessRole: null,
          lastError: subscription.lastError,
        }
      : null,
  });
}

function toLinkState(link: {
  tripId: number;
  calendarId: string;
  calendarName: string | null;
  ownerId: string;
  lastSyncedAt: Date | null;
  lastError: string | null;
  skippedCount: number;
}): TripCalendarLinkState {
  return {
    tripId: link.tripId,
    calendarId: link.calendarId,
    calendarName: link.calendarName,
    ownerId: link.ownerId,
    lastSyncedAt: link.lastSyncedAt?.toISOString() ?? null,
    lastError: normalizeLastError(link.lastError),
    skippedCount: link.skippedCount,
  };
}
