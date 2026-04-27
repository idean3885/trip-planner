/**
 * 멤버 라이프사이클에 맞춘 공유 캘린더 ACL 동기화 (#349, spec 019, spec 024 #416).
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
 *
 * spec 024 (#416) 위임 — onMemberJoin/onRoleChange/onMemberLeave/onOwnerTransfer 모두
 * service 모듈(`reconcileMemberAcl`, `reconcileOwnerTransfer`)로 위임. provider 분기 +
 * retain 판정이 캡슐화된다.
 */

import { TripRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  reconcileMemberAcl,
  reconcileOwnerTransfer,
} from "@/lib/calendar/service";

/**
 * 신규 멤버 가입 시 오너 토큰으로 ACL 부여.
 * 오너 본인은 대상 아님 (Google이 데이터 오너로 자동 인식).
 */
export async function onMemberJoin(
  tripId: number,
  userId: string,
  role: TripRole
): Promise<void> {
  try {
    await reconcileMemberAcl({
      tripId,
      memberUserId: userId,
      memberEmail: await loadMemberEmail(userId),
      newRole: role,
    });
  } catch (err) {
    console.warn(
      `[gcal] onMemberJoin failed tripId=${tripId} userId=${userId} role=${role} reason=${(err as Error).message}`,
    );
  }
}

/**
 * 멤버 역할 변경 시 ACL role 조정.
 * provider.upsertMemberAcl이 idempotent하게 patch 처리.
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
  try {
    await reconcileMemberAcl({
      tripId,
      memberUserId: userId,
      memberEmail: await loadMemberEmail(userId),
      newRole,
    });
  } catch (err) {
    console.warn(
      `[gcal] onRoleChange failed tripId=${tripId} userId=${userId} newRole=${newRole} reason=${(err as Error).message}`,
    );
  }
}

/**
 * 멤버 탈퇴/제거 시 ACL 회수.
 * spec 024 (#416) — `reconcileMemberAcl({ newRole: null })`이 내부에서
 * `revokeMemberAcl({ retainIfStillNeeded: true })` 호출. 같은 외부 캘린더를 다른
 * 활성 trip이 공유 중이면 회수 보류 → 다른 trip 멤버 시청 보호.
 */
export async function onMemberLeave(tripId: number, userId: string): Promise<void> {
  const link = await prisma.tripCalendarLink.findUnique({ where: { tripId } });
  if (!link) return;

  try {
    const memberEmail = await loadMemberEmail(userId);
    if (memberEmail) {
      await reconcileMemberAcl({
        tripId,
        memberUserId: userId,
        memberEmail,
        newRole: null,
      });
    }
  } catch (err) {
    console.warn(
      `[gcal] onMemberLeave failed tripId=${tripId} userId=${userId} reason=${(err as Error).message}`,
    );
  }

  // 멤버의 subscription 레코드 정리 (cascade 외에 명시 delete — link 미삭제 시 orphan 방지).
  await prisma.memberCalendarSubscription
    .deleteMany({ where: { linkId: link.id, userId } })
    .catch((err) => {
      console.warn(`[gcal] cleanup subscription failed userId=${userId}`, err);
    });
}

async function loadMemberEmail(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return user?.email ?? "";
}

/**
 * 오너 이관 시 호출. service.reconcileOwnerTransfer가 옛 오너 ACL 격하 + DB ownerId
 * 갱신을 함께 처리한다. 라우트는 본 함수 한 번만 호출하면 됨(별도 prisma 갱신 불필요).
 */
export async function onOwnerTransfer(
  tripId: number,
  previousOwnerUserId: string,
  newOwnerUserId: string,
): Promise<void> {
  try {
    await reconcileOwnerTransfer({
      tripId,
      previousOwnerId: previousOwnerUserId,
      newOwnerId: newOwnerUserId,
    });
  } catch (err) {
    console.warn(
      `[gcal] onOwnerTransfer failed tripId=${tripId} prev=${previousOwnerUserId} new=${newOwnerUserId} reason=${(err as Error).message}`,
    );
  }
}
