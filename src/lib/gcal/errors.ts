/**
 * 외부 캘린더 API 오류 분류 유틸.
 * DB 의존이 없어 단위 테스트에서 단독으로 import 가능.
 */

import type { FailureReason, GCalLastError } from "@/types/gcal";

interface HttpLikeError {
  code?: number;
  status?: number;
  response?: { status?: number; data?: unknown };
  message?: string;
}

export function getStatus(err: unknown): number {
  const e = err as HttpLikeError;
  return e.code ?? e.status ?? e.response?.status ?? 0;
}

/**
 * spec 021: 본 앱의 OAuth 앱이 Testing 모드로 운영되어, 현재 계정이 Test users 목록에
 * 없으면 외부 OAuth 제공자가 access_denied/unverified_client/미심사 앱 거부로 차단한다.
 * 일반 401/403(권한 회수 REVOKED)과 구분해 UNREGISTERED로 분류한다.
 *
 * 감지 전략: 상태 코드 400/401/403에서 에러 메시지나 payload 문자열에 Testing 모드 관련
 * 키워드가 포함되어 있는지 검사한다. 정확한 포맷은 외부 제공자 변경 가능성이 있어
 * 보수적으로 여러 시그널을 OR로 묶는다.
 */
export function isUnregisteredError(err: unknown): boolean {
  const status = getStatus(err);
  if (status !== 400 && status !== 401 && status !== 403) return false;
  const text = extractErrorText(err).toLowerCase();
  if (!text) return false;
  return (
    text.includes("access_denied") ||
    text.includes("not completed verification") ||
    text.includes("unverified_client") ||
    text.includes("has not been tested") ||
    text.includes("has not completed the") ||
    text.includes("test user")
  );
}

function extractErrorText(err: unknown): string {
  if (err == null) return "";
  if (typeof err === "string") return err;
  const parts: string[] = [];
  const e = err as HttpLikeError & { errors?: unknown };
  if (typeof e.message === "string") parts.push(e.message);
  if (e.response?.data !== undefined) {
    try {
      parts.push(typeof e.response.data === "string" ? e.response.data : JSON.stringify(e.response.data));
    } catch {
      // ignore serialization error
    }
  }
  if (e.errors !== undefined) {
    try {
      parts.push(JSON.stringify(e.errors));
    } catch {
      // ignore
    }
  }
  return parts.join(" ");
}

export function classifyError(err: unknown): {
  reason: FailureReason;
  lastError: GCalLastError;
} {
  if (isUnregisteredError(err)) {
    return { reason: "unregistered", lastError: "UNREGISTERED" };
  }
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
