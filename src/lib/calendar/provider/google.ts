/**
 * spec 024 (#416) — Google Calendar provider 구현체.
 *
 * Implementation 2단(본 PR): 인증·캘린더·ACL·에러 메서드를 기존 src/lib/gcal/* 함수에
 * 위임. 단일 이벤트 메서드(putEvent/updateEvent/deleteEvent)는 sync.ts가 batch로
 * 다루므로 호출 경로가 없어 stub 유지 — 후속 분해 회차에서 sync.ts를 메서드 단위로
 * 쪼갤 때 채워진다.
 *
 * 본 메서드들은 라우트 권한 검증을 통과한 호출만 받는다(권한 재검증 안 함).
 */

import { prisma } from "@/lib/prisma";
import { getCalendarClient } from "@/lib/gcal/client";
import { hasCalendarScope, buildConsentRedirectUrl } from "@/lib/gcal/auth";
import {
  upsertAcl,
  deleteAcl,
} from "@/lib/gcal/acl";
import {
  classifyError as classifyGCalError,
  isPreconditionFailed,
  isUnregisteredError,
} from "@/lib/gcal/errors";

import type {
  CalendarErrorCode,
  CalendarProvider,
  CalendarRef,
  ExternalEventRef,
  ProviderCapabilities,
  RevokeAclResult,
} from "./types";

const NOT_IMPLEMENTED_SINGLE_EVENT =
  "googleProvider.{put,update,delete}Event는 sync.ts batch 분해 회차에서 구현 예정. " +
  "현재는 service가 src/lib/gcal/sync.ts의 syncActivities를 직접 호출한다.";

const CAPABILITIES: ProviderCapabilities = {
  autoMemberAcl: "auto",
  supportsCalendarCreation: true,
  supportsCalendarSelection: true,
};

export const googleProvider: CalendarProvider = {
  id: "GOOGLE",
  capabilities: CAPABILITIES,

  async hasValidAuth(userId: string): Promise<boolean> {
    return hasCalendarScope(userId);
  },

  async getReauthUrl(_userId: string, returnTo: string): Promise<string | null> {
    return buildConsentRedirectUrl(returnTo);
  },

  async listCalendars(userId: string): Promise<CalendarRef[]> {
    const client = await getCalendarClient(userId);
    if (!client) return [];
    const res = await client.calendar.calendarList.list({
      maxResults: 250,
      showHidden: false,
    });
    const items = res.data.items ?? [];
    return items.map((c) => ({
      calendarId: c.id ?? "",
      displayName: c.summary ?? null,
      // Google Calendar는 캘린더당 컴포넌트 분리 개념이 없음 (모든 캘린더가 VEVENT 지원).
      // VTODO 전용 캘린더 자동 필터는 Apple CalDAV에서 의미 있고, Google에선 항상 VEVENT.
      components: ["VEVENT"] as const as ("VEVENT" | "VTODO")[],
    }));
  },

  async createCalendar(userId: string, name: string): Promise<CalendarRef> {
    const client = await getCalendarClient(userId);
    if (!client) {
      throw new Error("Google Calendar client unavailable for user");
    }
    const res = await client.calendar.calendars.insert({
      requestBody: { summary: name },
    });
    return {
      calendarId: res.data.id ?? "",
      displayName: res.data.summary ?? name,
      components: ["VEVENT"],
    };
  },

  async putEvent(
    _userId: string,
    _calendarId: string,
    _ics: string,
  ): Promise<ExternalEventRef> {
    throw new Error(NOT_IMPLEMENTED_SINGLE_EVENT);
  },

  async updateEvent(
    _userId: string,
    _ref: ExternalEventRef,
    _ics: string,
  ): Promise<ExternalEventRef> {
    throw new Error(NOT_IMPLEMENTED_SINGLE_EVENT);
  },

  async deleteEvent(_userId: string, _ref: ExternalEventRef): Promise<void> {
    throw new Error(NOT_IMPLEMENTED_SINGLE_EVENT);
  },

  async upsertMemberAcl(args: {
    userId: string;
    calendarId: string;
    memberEmail: string;
    role: "writer" | "reader";
  }): Promise<void> {
    const client = await getCalendarClient(args.userId);
    if (!client) {
      throw new Error("Google Calendar client unavailable for user");
    }
    const result = await upsertAcl(client.calendar, {
      calendarId: args.calendarId,
      email: args.memberEmail,
      role: args.role,
    });
    if (!result.ok) {
      throw new Error(`upsertAcl failed: ${result.reason ?? "unknown"} status=${result.status ?? "?"}`);
    }
  },

  async revokeMemberAcl(args: {
    userId: string;
    calendarId: string;
    memberEmail: string;
    retainIfStillNeeded: boolean;
  }): Promise<RevokeAclResult> {
    if (args.retainIfStillNeeded) {
      // 같은 calendarId를 가리키며 ownerId가 args.userId(주인)인 다른 활성 link가 있고,
      // 그 link의 멤버 중 args.memberEmail이 활성(ADDED) subscription을 갖는다면
      // 회수 시 다른 여행 시청이 깨짐 → 보류.
      const otherActive = await prisma.tripCalendarLink.findFirst({
        where: {
          calendarId: args.calendarId,
          ownerId: args.userId,
          subscriptions: {
            some: {
              user: { email: args.memberEmail },
              status: "ADDED",
            },
          },
        },
        select: { id: true, tripId: true },
      });
      if (otherActive) {
        return {
          revoked: false,
          retainedReason: `다른 여행(tripId=${otherActive.tripId})에서 동일 캘린더를 활성 사용 중`,
        };
      }
    }

    const client = await getCalendarClient(args.userId);
    if (!client) {
      throw new Error("Google Calendar client unavailable for user");
    }
    const result = await deleteAcl(client.calendar, {
      calendarId: args.calendarId,
      email: args.memberEmail,
    });
    if (!result.ok) {
      throw new Error(`deleteAcl failed: ${result.reason ?? "unknown"} status=${result.status ?? "?"}`);
    }
    return { revoked: true };
  },

  classifyError(err: unknown): CalendarErrorCode | null {
    // 6종 vocabulary로 정규화. 기존 src/lib/gcal/errors.ts의 분류를 매핑.
    if (isUnregisteredError(err)) return "unregistered_user";
    if (isPreconditionFailed(err)) return "precondition_failed";
    const { reason, lastError } = classifyGCalError(err);
    if (lastError === "REVOKED") return "revoked";
    if (reason === "forbidden") return "auth_invalid";
    if (reason === "rate_limited" || reason === "network") return "transient_failure";
    return null;
  },
};
