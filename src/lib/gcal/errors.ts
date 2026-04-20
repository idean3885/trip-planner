/**
 * Google Calendar API 오류 분류 유틸.
 * DB/Prisma 의존이 없어 단위 테스트에서 단독으로 import 가능.
 */

import type { FailureReason, GCalLastError } from "@/types/gcal";

interface HttpLikeError {
  code?: number;
  status?: number;
  response?: { status?: number };
}

export function getStatus(err: unknown): number {
  const e = err as HttpLikeError;
  return e.code ?? e.status ?? e.response?.status ?? 0;
}

export function classifyError(err: unknown): {
  reason: FailureReason;
  lastError: GCalLastError;
} {
  const status = getStatus(err);
  if (status === 401 || status === 403)
    return { reason: "forbidden", lastError: "REVOKED" };
  if (status === 404) return { reason: "not_found", lastError: null };
  if (status === 429) return { reason: "rate_limited", lastError: "RATE_LIMITED" };
  if (status >= 500 || status === 0)
    return { reason: "network", lastError: "NETWORK" };
  return { reason: "unknown", lastError: "UNKNOWN" };
}

export function isPreconditionFailed(err: unknown): boolean {
  const status = getStatus(err);
  return status === 409 || status === 412;
}
