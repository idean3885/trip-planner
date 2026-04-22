/**
 * 멤버 라이프사이클에 맞춘 공유 캘린더 ACL 동기화 (#349, spec 019).
 *
 * 호출처 — 트립 멤버 가입/역할 변경/탈퇴 시점:
 *  - src/app/invite/[token]/page.tsx (가입 수락)
 *  - src/app/api/trips/[id]/members/route.ts (역할 승격·강등·제거)
 *  - src/app/api/trips/[id]/leave/route.ts (본인 탈퇴)
 *  - src/app/api/trips/[id]/transfer/route.ts (오너 이관)
 *
 * 설계 원칙:
 *  - 캘린더 ACL 실패는 멤버 조작 자체를 차단하지 않는다 (외부 동기화는 부가 기능)
 *  - 오너 토큰이 없거나 공유 캘린더 미연결이면 no-op
 *  - 실패 사유는 서버 로그로만 남김 (사용자 화면 노출은 후속 UI가 담당)
 */

import { TripRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCalendarClient } from "./client";
import { upsertAcl, patchAclRole, deleteAcl, mapRoleToAcl } from "./acl";

async function resolveContext(tripId: number, memberUserId: string) {
  const link = await prisma.tripCalendarLink.findUnique({ where: { tripId } });
  if (!link) return null;

  const memberUser = await prisma.user.findUnique({
    where: { id: memberUserId },
    select: { email: true },
  });
  if (!memberUser?.email) return null;

  const client = await getCalendarClient(link.ownerId);
  if (!client) return null;

  return { link, client, email: memberUser.email };
}

/**
 * 신규 멤버 가입 시 오너 토큰으로 ACL 부여.
 * 오너 본인은 대상 아님 (Google이 데이터 오너로 자동 인식).
 */
export async function onMemberJoin(
  tripId: number,
  userId: string,
  role: TripRole
): Promise<void> {
  if (role === TripRole.OWNER) return;
  const ctx = await resolveContext(tripId, userId);
  if (!ctx) return;

  const result = await upsertAcl(ctx.client.calendar, {
    calendarId: ctx.link.calendarId,
    email: ctx.email,
    role: mapRoleToAcl(role),
  });
  if (!result.ok) {
    console.warn(
      `[gcal] onMemberJoin failed tripId=${tripId} userId=${userId} role=${role} reason=${result.reason}`
    );
  }
}

/**
 * 멤버 역할 변경 시 ACL role 조정.
 * Rule ID는 user:<email>로 결정적이라 patch 가능.
 */
export async function onRoleChange(
  tripId: number,
  userId: string,
  newRole: TripRole
): Promise<void> {
  if (newRole === TripRole.OWNER) {
    // 오너 이관은 별도 경로에서 처리 (onOwnerTransfer).
    return;
  }
  const ctx = await resolveContext(tripId, userId);
  if (!ctx) return;

  const result = await patchAclRole(ctx.client.calendar, {
    calendarId: ctx.link.calendarId,
    email: ctx.email,
    role: mapRoleToAcl(newRole),
  });
  if (!result.ok) {
    console.warn(
      `[gcal] onRoleChange failed tripId=${tripId} userId=${userId} newRole=${newRole} reason=${result.reason}`
    );
  }
}

/**
 * 멤버 탈퇴/제거 시 ACL 회수.
 * 404는 "이미 없음"으로 성공 간주(deleteAcl 내부).
 */
export async function onMemberLeave(tripId: number, userId: string): Promise<void> {
  const ctx = await resolveContext(tripId, userId);
  if (!ctx) return;

  const result = await deleteAcl(ctx.client.calendar, {
    calendarId: ctx.link.calendarId,
    email: ctx.email,
  });
  if (!result.ok) {
    console.warn(
      `[gcal] onMemberLeave failed tripId=${tripId} userId=${userId} reason=${result.reason}`
    );
  }

  // 멤버의 subscription 레코드도 정리 (cascade 외에 명시 delete — link 미삭제 시 orphan 방지).
  await prisma.memberCalendarSubscription
    .deleteMany({ where: { linkId: ctx.link.id, userId } })
    .catch((err) => {
      console.warn(`[gcal] cleanup subscription failed userId=${userId}`, err);
    });
}

/**
 * 오너 이관 시: 이전 오너는 writer로, 새 오너는 ACL에서 제거(데이터 오너로 승격 불가능해도
 * 중복 role 방지). TripCalendarLink.ownerId는 호출자가 별도로 갱신.
 */
export async function onOwnerTransfer(
  tripId: number,
  previousOwnerUserId: string,
  newOwnerUserId: string
): Promise<void> {
  const link = await prisma.tripCalendarLink.findUnique({ where: { tripId } });
  if (!link) return;

  // 이전 오너는 HOST로 격하된 이후 이 훅이 호출되므로 그 역할로 ACL 갱신.
  const prevCtx = await resolveContext(tripId, previousOwnerUserId);
  if (prevCtx) {
    await upsertAcl(prevCtx.client.calendar, {
      calendarId: prevCtx.link.calendarId,
      email: prevCtx.email,
      role: "writer",
    });
  }

  // 새 오너는 데이터 오너가 아니므로 일단 owner role ACL을 부여 (데이터 이관은 외부 제약으로 불가).
  const newCtx = await resolveContext(tripId, newOwnerUserId);
  if (newCtx) {
    await upsertAcl(newCtx.client.calendar, {
      calendarId: newCtx.link.calendarId,
      email: newCtx.email,
      role: "owner",
    });
  }
}
