/**
 * spec 024 (#416) — 캘린더 서비스 레이어.
 *
 * 라우트 핸들러 ↔ provider 인터페이스 사이의 얇은 layer.
 * - link row 로드 후 link.provider로 구현체 분기
 * - provider 메서드 호출 결과를 기존 v2 응답 스키마로 normalize (FR-001)
 * - sync는 본 단계에선 기존 syncActivities를 직접 호출 (sync.ts batch 분해는 후속)
 *
 * 권한 검증은 라우트가 사전 수행한다 — 본 모듈은 권한 재검증 안 함.
 */

import { prisma } from "@/lib/prisma";
import { TripRole } from "@prisma/client";
import { getProvider } from "./provider/registry";
import type { CalendarErrorCode } from "./provider/types";

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
 * 라우트가 에러를 응답할 때 사용. provider.classifyError로 6종 vocabulary 매핑 후
 * 기존 응답 스키마와 호환되도록 `{ error, code }` 형태로 반환.
 *
 * code는 CalendarErrorCode 또는 null. 호출자(라우트)는 code별 사용자 메시지·HTTP
 * status 매핑을 결정.
 */
export interface NormalizedCalendarError {
  /** 기존 v2 응답 키 호환을 위해 그대로 유지되는 error 문자열. */
  error: string;
  /** 본 피처 신규 — 6종 vocabulary 정규화. UI는 점진적으로 본 코드로 분기 가능. */
  code: CalendarErrorCode | null;
}

export function normalizeCalendarError(
  tripId: number,
  err: unknown,
  fallbackError: string,
): NormalizedCalendarError {
  // provider 식별: link 로드 실패 가능성 있으므로 안전하게 try
  let code: CalendarErrorCode | null = null;
  try {
    // link가 없는 시점에 호출될 수 있으므로 GOOGLE 기본값으로 분류 시도
    code = getProvider("GOOGLE").classifyError(err);
  } catch {
    code = null;
  }
  // tripId는 추후 multi-provider 환경에서 link.provider로 정밀 분류할 때 사용
  void tripId;
  return { error: fallbackError, code };
}

/**
 * 멤버 라이프사이클(가입·역할 변경·탈퇴·오너 이관)에 따라 ACL 재동기화 시 사용.
 * 본 PR에서는 service에서 직접 provider.upsertMemberAcl/revokeMemberAcl을 호출.
 *
 * retain 판정은 provider.revokeMemberAcl 내부에서 수행 — 호출자는 플래그만 전달(FR-013).
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

  // capability에 따라 분기 (Apple "manual"인 경우 no-op 또는 사용자 안내)
  if (provider.capabilities.autoMemberAcl !== "auto") {
    return { skipped: true };
  }

  if (args.newRole === null || args.newRole === TripRole.OWNER) {
    // 멤버 제거 또는 새 OWNER (오너는 외부 owner role을 우리가 관리하지 않음 — Google에선 본인이 owner)
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
