/**
 * spec 027 — 외부 이벤트 import 멱등성.
 *
 * 같은 (provider, externalCalendarId, externalEventId)는 한 번만 draft 생성.
 * 어플리케이션 lookup + DB 유니크 인덱스 이중 안전망.
 */

import type { CalendarProviderId, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface DraftKey {
  provider: CalendarProviderId;
  externalCalendarId: string;
  externalEventId: string;
}

/** 같은 키의 기존 draft id를 외부 식별자 셋으로 조회. */
export async function findExistingDraftIds(args: {
  provider: CalendarProviderId;
  externalCalendarId: string;
  externalEventIds: string[];
}): Promise<Set<string>> {
  if (args.externalEventIds.length === 0) return new Set();
  const existing = await prisma.activityDraft.findMany({
    where: {
      provider: args.provider,
      externalCalendarId: args.externalCalendarId,
      externalEventId: { in: args.externalEventIds },
    },
    select: { externalEventId: true },
  });
  return new Set(existing.map((r) => r.externalEventId));
}

/** Prisma `P2002` 유니크 제약 위반 여부. race fallback 판정에 사용. */
export function isUniqueConstraintError(err: unknown): boolean {
  if (err && typeof err === "object" && "code" in err) {
    return (err as { code?: string }).code === "P2002";
  }
  return false;
}

/** 유니크 제약 위반 시 무시할 때 쓰는 헬퍼. 그 외 에러는 재throw. */
export async function ignoreUniqueViolation<T>(
  op: () => Promise<T>,
): Promise<T | null> {
  try {
    return await op();
  } catch (err) {
    if (isUniqueConstraintError(err)) return null;
    throw err;
  }
}

export type { Prisma };
