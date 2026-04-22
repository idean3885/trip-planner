/**
 * Google Calendar ACL 관리 래퍼.
 *
 * v2.9.0 per-trip 공유 모델에서 오너의 토큰으로 공유 캘린더의 ACL을 관리한다.
 * PoC(#349)에서 확인: acl.insert는 동일 scope에 대해 idempotent(same rule_id 반환,
 * 중복 Rule 생성 없음) → list-then-upsert 사전 조회 불필요.
 */

import type { calendar_v3 } from "@googleapis/calendar";
import { TripRole } from "@prisma/client";
import { classifyError, getStatus } from "./errors";

export type AclRole = "reader" | "writer" | "owner" | "freeBusyReader";

/** 트립 역할에서 파생 가능한 ACL role 서브셋. */
export type MemberAclRole = "owner" | "writer" | "reader";

/** 트립 역할을 외부 캘린더 ACL role로 매핑한다. */
export function mapRoleToAcl(role: TripRole): MemberAclRole {
  switch (role) {
    case TripRole.OWNER:
      return "owner";
    case TripRole.HOST:
      return "writer";
    case TripRole.GUEST:
      return "reader";
  }
}

export interface AclUpsertInput {
  calendarId: string;
  email: string;
  role: AclRole;
}

export interface AclUpsertResult {
  ok: boolean;
  ruleId?: string | null;
  role?: string | null;
  reason?: string;
  status?: number;
}

/**
 * 특정 이메일에 대해 지정 role을 부여/갱신한다.
 * insert가 idempotent이므로 그냥 insert를 시도한다. 에러 발생 시 분류해 반환.
 * sendNotifications는 Google이 Gmail 간 공유에서 자동 발송(외부 통제).
 */
export async function upsertAcl(
  calendar: calendar_v3.Calendar,
  input: AclUpsertInput
): Promise<AclUpsertResult> {
  try {
    const res = await calendar.acl.insert({
      calendarId: input.calendarId,
      sendNotifications: false,
      requestBody: {
        scope: { type: "user", value: input.email },
        role: input.role,
      },
    });
    return {
      ok: true,
      ruleId: res.data.id ?? null,
      role: res.data.role ?? null,
      status: res.status,
    };
  } catch (err) {
    const { reason } = classifyError(err);
    return { ok: false, reason, status: getStatus(err) };
  }
}

/**
 * 명시적으로 role을 갱신해야 할 때(예: reader ↔ writer 전환) patch 호출.
 * rule ID 형식은 `user:<email>`로 결정적.
 */
export async function patchAclRole(
  calendar: calendar_v3.Calendar,
  input: AclUpsertInput
): Promise<AclUpsertResult> {
  try {
    const res = await calendar.acl.patch({
      calendarId: input.calendarId,
      ruleId: `user:${input.email}`,
      sendNotifications: false,
      requestBody: { role: input.role },
    });
    return {
      ok: true,
      ruleId: res.data.id ?? null,
      role: res.data.role ?? null,
      status: res.status,
    };
  } catch (err) {
    const { reason } = classifyError(err);
    return { ok: false, reason, status: getStatus(err) };
  }
}

export interface AclDeleteInput {
  calendarId: string;
  email: string;
}

/** 특정 이메일의 ACL 제거. 404는 "이미 없음"으로 성공 간주. */
export async function deleteAcl(
  calendar: calendar_v3.Calendar,
  input: AclDeleteInput
): Promise<AclUpsertResult> {
  try {
    const res = await calendar.acl.delete({
      calendarId: input.calendarId,
      ruleId: `user:${input.email}`,
    });
    return { ok: true, status: res.status };
  } catch (err) {
    const status = getStatus(err);
    if (status === 404) return { ok: true, status };
    const { reason } = classifyError(err);
    return { ok: false, reason, status };
  }
}
