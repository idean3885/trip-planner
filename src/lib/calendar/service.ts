/**
 * spec 024 (#416) — 캘린더 서비스 레이어.
 *
 * 라우트 핸들러 ↔ provider 인터페이스 사이의 얇은 layer.
 * - 권한 검증 후 link row 로드
 * - getProvider(link.provider) 호출 또는 (expand 단계에 한해) 기존 gcal 모듈 직접 호출
 * - 응답 스키마는 기존 v2 응답 그대로 normalize (FR-001)
 *
 * 라우트는 본 모듈의 메서드를 호출하고 결과 union을 NextResponse로 변환만 한다.
 *
 * ── expand 단계 직접 호출 분기(SC-003 단서 조항) ──────────────────────────────
 * 본 회차는 라우트 → service 위임까지만 도입. service 내부에서 인터페이스를 경유하지
 * 않고 src/lib/gcal/* 직접 호출이 남은 메서드 목록 — contract 회차에서 인터페이스
 * 위임으로 변환 예정. 본 목록은 spec.md SC-003 "Google 직접 호출 분기 = 명시 목록
 * 외 0"의 그 명시 목록이다.
 *
 *   1) connectCalendar       — getCalendarClient + calendars.insert + upsertAcl/deleteAcl
 *   2) disconnectCalendar    — getCalendarClient + deleteAcl
 *   3) getCalendarStatus     — DB만, 외부 호출 없음 (참고용)
 *   4) syncCalendar          — getCalendarClient + upsertAcl + syncActivities (gcal/sync.ts)
 *   5) subscribeCalendar     — getCalendarClient + calendarList.insert
 *   6) unsubscribeCalendar   — getCalendarClient + calendarList.delete
 *   7) reconcileOwnerTransfer (새 오너 owner role ACL) — getCalendarClient + upsertAcl(role:"owner")
 *      이유: 인터페이스 upsertMemberAcl의 role enum이 "writer"|"reader"만 허용.
 *      contract 회차에서 인터페이스에 owner role 추가 또는 별도 transferOwnerAcl 메서드 도입.
 *
 * 인터페이스 경유 메서드(미래 contract 패턴 정답):
 *   - reconcileMemberAcl     (provider.upsertMemberAcl/revokeMemberAcl)
 *   - reconcileOwnerTransfer (provider.upsertMemberAcl writer 부분만)
 */

import { TripRole, type TripMember, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTripMember } from "@/lib/auth-helpers";
import {
  buildConsentRedirectUrl,
  hasCalendarScope,
} from "@/lib/gcal/auth";
import {
  getCalendarClient,
  classifyError as classifyGCalError,
  getStatus as getGCalStatus,
} from "@/lib/gcal/client";
import { dedicatedCalendarName } from "@/lib/gcal/format";
import {
  upsertAcl,
  deleteAcl,
  mapRoleToAcl,
  type AclUpsertResult,
} from "@/lib/gcal/acl";
import { syncActivities } from "@/lib/gcal/sync";
import { syncAppleActivities } from "./sync-apple";
import { getProvider } from "./provider/registry";
import type { CalendarErrorCode } from "./provider/types";
import type {
  ConsentRequired,
  GCalLastError,
  MemberAclState,
  MemberSubscribeResponse,
  SyncResponse,
  TripCalendarLastError,
  TripCalendarLinkResponse,
  TripCalendarLinkState,
} from "@/types/gcal";

// ────────────────────────────────────────────────────────────
// 결과 union — 라우트는 본 union을 NextResponse로 변환만 한다.
// ────────────────────────────────────────────────────────────

export type CalendarServiceResult<TOk> =
  | { kind: "ok"; status: 200; body: TOk }
  | { kind: "consent_required"; status: 409; body: ConsentRequired }
  | { kind: "error"; status: number; body: Record<string, unknown> };

function ok<T>(body: T): CalendarServiceResult<T> {
  return { kind: "ok", status: 200, body };
}

function err(
  status: number,
  body: Record<string, unknown>,
): CalendarServiceResult<never> {
  return { kind: "error", status, body };
}

function consentRequired(authorizationUrl: string): CalendarServiceResult<never> {
  return {
    kind: "consent_required",
    status: 409,
    body: { error: "consent_required", authorizationUrl },
  };
}

// ────────────────────────────────────────────────────────────
// 헬퍼
// ────────────────────────────────────────────────────────────

function normalizeLastError(raw: string | null): TripCalendarLastError {
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

function toMemberAclState(
  m: TripMember & { user: Pick<User, "id" | "email"> },
  aclResult: AclUpsertResult | undefined,
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

function loadMembersWithEmails(tripId: number) {
  return prisma.tripMember.findMany({
    where: { tripId },
    include: { user: { select: { id: true, email: true } } },
  });
}

/**
 * 여행 ID로 캘린더 link를 로드하고, 그 provider 구현체를 함께 반환.
 * link가 없으면 null. 라우트는 null 시 `{ linked: false }` 응답으로 분기.
 */
export async function loadLinkAndProvider(tripId: number) {
  const link = await prisma.tripCalendarLink.findUnique({
    where: { tripId },
  });
  if (!link) return null;
  const provider = getProvider(link.provider);
  return { link, provider };
}

/**
 * 라우트가 에러를 응답할 때 사용할 6종 vocabulary 매핑.
 * link.provider를 읽어 해당 provider의 classifyError를 호출한다 — Apple 추가 시
 * 자동으로 Apple 분류 사용.
 *
 * 본 함수는 현재 service 내부 메서드들이 v2 응답 스키마 호환을 위해 자체 분류
 * 로직(reason 문자열)을 사용하므로 외부 호출자가 없다. contract 회차에서 라우트
 * 응답 body에 6종 코드를 함께 노출할 때 호출 예정.
 */
export interface NormalizedCalendarError {
  /** 기존 v2 응답 키 호환을 위해 그대로 유지되는 error 문자열. */
  error: string;
  /** 6종 vocabulary 정규화. UI는 점진적으로 본 코드로 분기 가능. */
  code: CalendarErrorCode | null;
}

export async function normalizeCalendarError(
  tripId: number,
  e: unknown,
  fallbackError: string,
): Promise<NormalizedCalendarError> {
  let code: CalendarErrorCode | null = null;
  try {
    const ctx = await loadLinkAndProvider(tripId);
    const provider = ctx?.provider ?? getProvider("GOOGLE");
    code = provider.classifyError(e);
  } catch {
    code = null;
  }
  return { error: fallbackError, code };
}

// ────────────────────────────────────────────────────────────
// 멤버 라이프사이클 (members.ts에서 호출)
// ────────────────────────────────────────────────────────────

/**
 * 멤버 라이프사이클(가입·역할 변경·탈퇴·오너 이관)에 따라 ACL 재동기화 시 사용.
 * retain 판정은 provider.revokeMemberAcl 내부에서 수행 — 호출자는 플래그만 전달.
 */
export async function reconcileMemberAcl(args: {
  tripId: number;
  memberUserId: string;
  memberEmail: string;
  newRole: TripRole | null; // null이면 멤버 제거
}): Promise<{ skipped?: boolean; revoked?: boolean; retainedReason?: string }> {
  const ctx = await loadLinkAndProvider(args.tripId);
  if (!ctx) return { skipped: true };
  const { link, provider } = ctx;

  if (provider.capabilities.autoMemberAcl !== "auto") {
    return { skipped: true };
  }

  if (args.newRole === null || args.newRole === TripRole.OWNER) {
    if (args.newRole === null) {
      const result = await provider.revokeMemberAcl({
        userId: link.ownerId,
        calendarId: link.calendarId,
        memberEmail: args.memberEmail,
        retainIfStillNeeded: true,
      });
      return result;
    }
    return { skipped: true };
  }

  const aclRole = args.newRole === TripRole.HOST ? "writer" : "reader";
  await provider.upsertMemberAcl({
    userId: link.ownerId,
    calendarId: link.calendarId,
    memberEmail: args.memberEmail,
    role: aclRole,
  });
  return {};
}

/**
 * 오너 이관 시 호출. 신·구 오너의 ACL 상태를 정리하고 link.ownerId를 갱신한다.
 *
 * 동작:
 *  - 옛 오너 (HOST로 격하 후): writer ACL 부여(provider.upsertMemberAcl)
 *  - 새 오너: Google에선 데이터 오너 이관 불가(외부 제약), 다만 owner role ACL을 부여해
 *    인터페이스 외 직접 호출. 인터페이스 enum이 writer/reader라 본 케이스는 임시로
 *    Google client를 직접 사용한다 — provider 추상화 contract 회차에서 인터페이스 확장 예정.
 *  - DB: tripCalendarLink.ownerId를 새 오너로 갱신
 *
 * manual ACL provider(Apple 등)는 ACL 부여 단계 skip, ownerId만 갱신.
 */
export async function reconcileOwnerTransfer(args: {
  tripId: number;
  previousOwnerId: string;
  newOwnerId: string;
}): Promise<{ skipped?: boolean }> {
  const ctx = await loadLinkAndProvider(args.tripId);
  if (!ctx) return { skipped: true };
  const { link, provider } = ctx;

  if (provider.capabilities.autoMemberAcl !== "auto") {
    await prisma.tripCalendarLink.update({
      where: { id: link.id },
      data: { ownerId: args.newOwnerId },
    });
    return { skipped: true };
  }

  const [prevUser, newUser] = await Promise.all([
    prisma.user.findUnique({
      where: { id: args.previousOwnerId },
      select: { email: true },
    }),
    prisma.user.findUnique({
      where: { id: args.newOwnerId },
      select: { email: true },
    }),
  ]);

  if (prevUser?.email) {
    try {
      await provider.upsertMemberAcl({
        userId: link.ownerId,
        calendarId: link.calendarId,
        memberEmail: prevUser.email,
        role: "writer",
      });
    } catch (e) {
      console.warn(
        `[calendar] reconcileOwnerTransfer prev->writer failed tripId=${args.tripId}`,
        e instanceof Error ? e.message : e,
      );
    }
  }

  if (newUser?.email) {
    // 인터페이스가 owner role을 노출하지 않아 Google 직접 호출 — contract 회차에서 인터페이스 확장.
    // 토큰 주체: 이 시점의 link.ownerId는 아직 옛 오너(아래 update에서 갱신됨).
    // Google ACL 변경 권한은 캘린더 데이터 오너(=옛 오너)가 보유하므로 옛 오너 토큰 사용이 정확.
    const client = await getCalendarClient(link.ownerId);
    if (client) {
      try {
        await upsertAcl(client.calendar, {
          calendarId: link.calendarId,
          email: newUser.email,
          role: "owner",
        });
      } catch (e) {
        console.warn(
          `[calendar] reconcileOwnerTransfer new->owner failed tripId=${args.tripId}`,
          e instanceof Error ? e.message : e,
        );
      }
    }
  }

  await prisma.tripCalendarLink.update({
    where: { id: link.id },
    data: { ownerId: args.newOwnerId },
  });

  return {};
}

// ────────────────────────────────────────────────────────────
// 라우트 핸들러용 메서드 — 응답 스키마는 v2 그대로
// ────────────────────────────────────────────────────────────

interface CallerCtx {
  userId: string;
  tripId: number;
}

export async function connectCalendar(
  caller: CallerCtx,
): Promise<CalendarServiceResult<TripCalendarLinkResponse>> {
  const member = await getTripMember(caller.tripId, caller.userId);
  if (!member) return err(403, { error: "not_a_member" });
  if (member.role !== TripRole.OWNER) return err(403, { error: "owner_only" });

  if (!(await hasCalendarScope(caller.userId))) {
    return consentRequired(
      buildConsentRedirectUrl(`/trips/${caller.tripId}?gcal=link-ready`),
    );
  }

  const trip = await prisma.trip.findUnique({
    where: { id: caller.tripId },
    select: { id: true, title: true },
  });
  if (!trip) return err(404, { error: "trip_not_found" });

  const client = await getCalendarClient(caller.userId);
  if (!client) return err(409, { error: "no_google_account" });

  let link = await prisma.tripCalendarLink.findUnique({
    where: { tripId: caller.tripId },
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
    } catch (e) {
      const { reason } = classifyGCalError(e);
      if (reason === "unregistered") {
        return err(403, { error: "unregistered", reason });
      }
      return err(502, { error: "calendar_create_failed", reason });
    }
    link = await prisma.tripCalendarLink.create({
      data: {
        tripId: caller.tripId,
        ownerId: caller.userId,
        calendarId,
        calendarName,
      },
    });
  }

  const members = await loadMembersWithEmails(caller.tripId);
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
  return ok(body);
}

/**
 * Apple iCloud CalDAV 전용 연결 (spec 025 #417).
 *
 * Google과 분리한 이유:
 *  - Apple은 capability `manual`이라 멤버 ACL 자동 부여 단계 0
 *  - 자격증명 입력 흐름이 OAuth가 아닌 위자드 → 별도 진입점이 자연스러움
 *  - createCalendar의 calendar-home URL 추정 등 Google과 동작 분기가 큼
 *
 * 사전 조건: validate 라우트로 AppleCalendarCredential row가 이미 저장되어 있어야 한다.
 */
export async function connectAppleCalendar(
  caller: CallerCtx,
): Promise<
  CalendarServiceResult<
    TripCalendarLinkResponse & { manualAclGuidance?: string }
  >
> {
  const member = await getTripMember(caller.tripId, caller.userId);
  if (!member) return err(403, { error: "not_a_member" });
  if (member.role !== TripRole.OWNER) return err(403, { error: "owner_only" });

  const provider = getProvider("APPLE");
  const hasAuth = await provider.hasValidAuth(caller.userId);
  if (!hasAuth) {
    return err(409, {
      error: "apple_not_authenticated",
      reauthUrl: `/trips/${caller.tripId}/calendar/connect-apple`,
    });
  }

  const trip = await prisma.trip.findUnique({
    where: { id: caller.tripId },
    select: { id: true, title: true },
  });
  if (!trip) return err(404, { error: "trip_not_found" });

  let link = await prisma.tripCalendarLink.findUnique({
    where: { tripId: caller.tripId },
  });

  if (!link) {
    let createdRef;
    try {
      createdRef = await provider.createCalendar(
        caller.userId,
        dedicatedCalendarName(trip.title),
      );
    } catch (e) {
      const code = provider.classifyError(e);
      if (code === "auth_invalid") {
        return err(409, {
          error: "apple_not_authenticated",
          reauthUrl: `/trips/${caller.tripId}/calendar/connect-apple`,
        });
      }
      return err(502, {
        error: "calendar_create_failed",
        reason: code ?? "unknown",
      });
    }
    link = await prisma.tripCalendarLink.create({
      data: {
        tripId: caller.tripId,
        ownerId: caller.userId,
        provider: "APPLE",
        calendarId: createdRef.calendarId,
        calendarName: createdRef.displayName,
      },
    });
  } else if (link.provider !== "APPLE") {
    return err(409, {
      error: "already_linked_other_provider",
      currentProvider: link.provider,
    });
  }

  // capability "manual" — 멤버 ACL 자동 부여 0회. 안내 텍스트만 응답에 포함.
  const members = await loadMembersWithEmails(caller.tripId);
  const otherMemberEmails = members
    .filter((m) => m.role !== TripRole.OWNER && m.user.email)
    .map((m) => m.user.email!);

  const guidance =
    otherMemberEmails.length > 0
      ? `Apple Calendar 앱에서 [${otherMemberEmails.join(", ")}]을 캘린더 공유로 직접 초대해 주세요.`
      : undefined;

  const body: TripCalendarLinkResponse & { manualAclGuidance?: string } = {
    status: "ok",
    link: toLinkState(link),
    members: members.map((m) => ({
      userId: m.userId,
      email: m.user.email ?? "",
      role: m.role,
      aclRole: mapRoleToAcl(m.role),
      aclStatus: "granted",
    })),
    ...(guidance ? { manualAclGuidance: guidance } : {}),
  };
  return ok(body);
}

export async function disconnectCalendar(
  caller: CallerCtx,
): Promise<CalendarServiceResult<{ status: "ok" }>> {
  const member = await getTripMember(caller.tripId, caller.userId);
  if (member?.role !== TripRole.OWNER) {
    return err(403, { error: "owner_only" });
  }

  const link = await prisma.tripCalendarLink.findUnique({
    where: { tripId: caller.tripId },
  });
  if (!link) return err(404, { error: "not_linked" });

  const client = await getCalendarClient(caller.userId);
  if (client) {
    const members = await loadMembersWithEmails(caller.tripId);
    for (const m of members) {
      if (m.role === TripRole.OWNER) continue;
      if (!m.user.email) continue;
      await deleteAcl(client.calendar, {
        calendarId: link.calendarId,
        email: m.user.email,
      });
    }
  }

  await prisma.tripCalendarLink.delete({ where: { id: link.id } });
  return ok({ status: "ok" });
}

export async function getCalendarStatus(
  caller: CallerCtx,
): Promise<CalendarServiceResult<Record<string, unknown>>> {
  const member = await getTripMember(caller.tripId, caller.userId);
  if (!member) return err(403, { error: "not_a_member" });

  const link = await prisma.tripCalendarLink.findUnique({
    where: { tripId: caller.tripId },
  });
  if (!link) {
    const scopeGranted = await hasCalendarScope(caller.userId);
    return ok({ linked: false, scopeGranted });
  }

  if (member.role === TripRole.OWNER) {
    const members = await loadMembersWithEmails(caller.tripId);
    return ok({
      linked: true,
      link: toLinkState(link),
      members: members.map((m) => ({
        userId: m.userId,
        email: m.user.email ?? "",
        role: m.role,
        aclRole: mapRoleToAcl(m.role),
        aclStatus: "granted" as const,
      })),
    });
  }

  const subscription = await prisma.memberCalendarSubscription.findUnique({
    where: { linkId_userId: { linkId: link.id, userId: caller.userId } },
  });
  return ok({
    linked: true,
    link: toLinkState(link),
    subscription: subscription
      ? {
          tripId: caller.tripId,
          status: subscription.status,
          accessRole: null,
          lastError: subscription.lastError,
        }
      : null,
  });
}

/**
 * Apple link 전용 sync 분기. service.syncCalendar에서 link.provider="APPLE"일 때 호출.
 *
 * Google과 다른 점:
 *  - OAuth scope 검증 0 (Apple은 app-specific password)
 *  - 멤버 ACL 자동 부여 0회 (capability "manual")
 *  - syncAppleActivities로 위임 (provider.putEvent/updateEvent/deleteEvent)
 */
async function syncAppleLinkBranch(
  caller: CallerCtx,
  link: { id: number; calendarId: string; calendarName: string | null; ownerId: string },
  args: { tripUrl: string },
): Promise<CalendarServiceResult<SyncResponse>> {
  const provider = getProvider("APPLE");
  const hasAuth = await provider.hasValidAuth(link.ownerId);
  if (!hasAuth) {
    return err(409, {
      error: "apple_not_authenticated",
      reauthUrl: `/trips/${caller.tripId}/calendar/connect-apple?apple_reauth=1`,
    });
  }

  const trip = await prisma.trip.findUnique({
    where: { id: caller.tripId },
    select: { id: true, title: true },
  });
  if (!trip) return err(404, { error: "trip_not_found" });

  let result;
  try {
    result = await syncAppleActivities({
      tripCalendarLinkId: link.id,
      calendarId: link.calendarId,
      trip,
      tripUrl: args.tripUrl,
      ownerId: link.ownerId,
    });
  } catch (e) {
    const code = provider.classifyError(e);
    if (code === "auth_invalid") {
      return err(409, {
        error: "apple_not_authenticated",
        reauthUrl: `/trips/${caller.tripId}/calendar/connect-apple?apple_reauth=1`,
      });
    }
    return err(502, { error: "sync_failed", reason: code ?? "unknown" });
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
  return ok(body);
}

export async function syncCalendar(
  caller: CallerCtx,
  args: { tripUrl: string },
): Promise<CalendarServiceResult<SyncResponse>> {
  const member = await getTripMember(caller.tripId, caller.userId);
  if (!member || (member.role !== TripRole.OWNER && member.role !== TripRole.HOST)) {
    return err(403, { error: "editor_only" });
  }

  const link = await prisma.tripCalendarLink.findUnique({
    where: { tripId: caller.tripId },
  });
  if (!link) return err(404, { error: "not_linked" });

  // Apple link는 OAuth scope 무관 — 분기 분리
  if (link.provider === "APPLE") {
    return syncAppleLinkBranch(caller, link, args);
  }

  if (member.role === TripRole.OWNER && !(await hasCalendarScope(caller.userId))) {
    return consentRequired(
      buildConsentRedirectUrl(`/trips/${caller.tripId}?gcal=synced`),
    );
  }

  const trip = await prisma.trip.findUnique({
    where: { id: caller.tripId },
    select: { id: true, title: true },
  });
  if (!trip) return err(404, { error: "trip_not_found" });

  const client = await getCalendarClient(link.ownerId);
  if (!client) return err(502, { error: "owner_token_unavailable" });

  // 멤버 ACL 재부여 (idempotent). v2.8.0→v2.9.0 마이그레이션 보정.
  const members = await prisma.tripMember.findMany({
    where: { tripId: caller.tripId, NOT: { role: TripRole.OWNER } },
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
        `[gcal] sync-time ACL upsert failed tripId=${caller.tripId} userId=${m.userId} reason=${aclResult.reason}`,
      );
    }
  }

  let result;
  try {
    result = await syncActivities(client, {
      tripCalendarLinkId: link.id,
      calendarId: link.calendarId,
      trip,
      tripUrl: args.tripUrl,
    });
  } catch (e) {
    const { reason } = classifyGCalError(e);
    if (reason === "unregistered") {
      return err(403, { error: "unregistered", reason });
    }
    return err(502, { error: "sync_failed", reason });
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
  return ok(body);
}

export async function subscribeCalendar(
  caller: CallerCtx,
): Promise<CalendarServiceResult<MemberSubscribeResponse>> {
  const member = await getTripMember(caller.tripId, caller.userId);
  if (!member) return err(403, { error: "not_a_member" });

  const link = await prisma.tripCalendarLink.findUnique({
    where: { tripId: caller.tripId },
  });
  if (!link) return err(404, { error: "not_linked" });

  if (!(await hasCalendarScope(caller.userId))) {
    return consentRequired(
      buildConsentRedirectUrl(`/trips/${caller.tripId}?gcal=subscribed`),
    );
  }

  const client = await getCalendarClient(caller.userId);
  if (!client) return err(409, { error: "no_google_account" });

  try {
    const res = await client.calendar.calendarList.insert({
      requestBody: { id: link.calendarId },
    });
    const subscription = await prisma.memberCalendarSubscription.upsert({
      where: { linkId_userId: { linkId: link.id, userId: caller.userId } },
      create: {
        linkId: link.id,
        userId: caller.userId,
        status: "ADDED",
        lastError: null,
      },
      update: { status: "ADDED", lastError: null },
    });
    const body: MemberSubscribeResponse = {
      status: "ok",
      subscription: {
        tripId: caller.tripId,
        status: subscription.status,
        accessRole: res.data.accessRole ?? null,
        lastError: null,
      },
    };
    return ok(body);
  } catch (e) {
    const status = getGCalStatus(e);
    const { reason } = classifyGCalError(e);
    await prisma.memberCalendarSubscription.upsert({
      where: { linkId_userId: { linkId: link.id, userId: caller.userId } },
      create: {
        linkId: link.id,
        userId: caller.userId,
        status: "ERROR",
        lastError: reason,
      },
      update: { status: "ERROR", lastError: reason },
    });
    const body: MemberSubscribeResponse = { status: "failed", error: reason };
    return err(status >= 400 ? status : 502, body as unknown as Record<string, unknown>);
  }
}

export async function unsubscribeCalendar(
  caller: CallerCtx,
): Promise<CalendarServiceResult<{ status: "ok" }>> {
  const member = await getTripMember(caller.tripId, caller.userId);
  if (!member) return err(403, { error: "not_a_member" });

  const link = await prisma.tripCalendarLink.findUnique({
    where: { tripId: caller.tripId },
  });
  if (!link) return err(404, { error: "not_linked" });

  const client = await getCalendarClient(caller.userId);
  if (client) {
    try {
      await client.calendar.calendarList.delete({ calendarId: link.calendarId });
    } catch (e) {
      if (getGCalStatus(e) !== 404) {
        console.warn(
          `[gcal] calendarList.delete failed userId=${caller.userId} tripId=${caller.tripId}`,
          e instanceof Error ? e.message : e,
        );
      }
    }
  }

  await prisma.memberCalendarSubscription.upsert({
    where: { linkId_userId: { linkId: link.id, userId: caller.userId } },
    create: {
      linkId: link.id,
      userId: caller.userId,
      status: "NOT_ADDED",
      lastError: null,
    },
    update: { status: "NOT_ADDED", lastError: null },
  });

  return ok({ status: "ok" });
}
