/**
 * spec 025 (#417) — Apple iCloud CalDAV provider 구현체.
 *
 * POC #345 측정 결과 + 의사결정 5건 + 추가 발견 3건을 그대로 구현한다.
 *
 * - 인증: Basic Auth + app-specific password (OAuth 미제공)
 * - 캘린더: MKCALENDAR로 자동 생성 (iCloud 미공식이지만 안정 작동)
 * - 이벤트: VEVENT PUT/UPDATE/DELETE + ETag strict 추적
 * - 멤버 ACL: capability "manual" — Apple은 멤버 초대 API 미제공, 사용자가 직접 처리
 * - 에러 vocabulary: 401→auth_invalid, 412→precondition_failed, 5xx/network→transient_failure
 */

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createAppleClient, type AppleDAVClient } from "./apple-client";
import { decryptPassword } from "./apple-crypto";
import { extractIcsUid } from "../ics";
import type {
  CalendarErrorCode,
  CalendarProvider,
  CalendarRef,
  ExternalEventRef,
  ProviderCapabilities,
  RevokeAclResult,
} from "./types";

const CAPABILITIES: ProviderCapabilities = {
  autoMemberAcl: "manual",
  supportsCalendarCreation: true,
  supportsCalendarSelection: true,
};

/** 7일 이내 검증된 credential은 trust. 초과면 PROPFIND 재검증. */
const VALIDATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function loadClient(userId: string): Promise<AppleDAVClient | null> {
  const cred = await prisma.appleCalendarCredential.findUnique({
    where: { userId },
  });
  if (!cred) return null;
  let plainPassword: string;
  try {
    plainPassword = decryptPassword(cred.encryptedPassword, cred.iv);
  } catch (e) {
    console.warn(
      `[apple] decrypt failed userId=${userId} reason=${(e as Error).message}`,
    );
    return null;
  }
  return createAppleClient({
    appleId: cred.appleId,
    appPassword: plainPassword,
  });
}

/** HTTP status를 unknown error에서 추출. tsdav는 fetch Response 또는 Error를 throw할 수 있다. */
function extractStatus(err: unknown): number | null {
  if (err && typeof err === "object") {
    const obj = err as { status?: unknown; response?: { status?: unknown }; statusCode?: unknown };
    if (typeof obj.status === "number") return obj.status;
    if (typeof obj.statusCode === "number") return obj.statusCode;
    if (obj.response && typeof obj.response.status === "number") return obj.response.status;
  }
  if (err instanceof Error) {
    const m = err.message.match(/\b(\d{3})\b/);
    if (m) {
      const n = Number(m[1]);
      if (n >= 100 && n < 600) return n;
    }
  }
  return null;
}

function isNetworkError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("network") ||
      msg.includes("fetch failed") ||
      msg.includes("econnrefused") ||
      msg.includes("etimedout") ||
      msg.includes("enotfound")
    );
  }
  return false;
}

export const appleProvider: CalendarProvider = {
  id: "APPLE",
  capabilities: CAPABILITIES,

  async hasValidAuth(userId: string): Promise<boolean> {
    const cred = await prisma.appleCalendarCredential.findUnique({
      where: { userId },
    });
    if (!cred) return false;
    if (
      cred.lastValidatedAt &&
      Date.now() - cred.lastValidatedAt.getTime() < VALIDATION_TTL_MS &&
      !cred.lastError
    ) {
      return true;
    }
    // TTL 초과 또는 lastError 존재 시 재검증
    const client = await loadClient(userId);
    if (!client) return false;
    try {
      await client.fetchCalendars();
      await prisma.appleCalendarCredential.update({
        where: { userId },
        data: { lastValidatedAt: new Date(), lastError: null },
      });
      return true;
    } catch (e) {
      const code = appleProvider.classifyError(e);
      await prisma.appleCalendarCredential.update({
        where: { userId },
        data: { lastError: code ?? "unknown" },
      });
      return false;
    }
  },

  async getReauthUrl(_userId: string, returnTo: string): Promise<string | null> {
    // Apple은 OAuth 미제공 — 위자드 진입 URL 반환. tripId는 returnTo에서 추출되거나
    // 호출자가 path를 그대로 사용한다.
    const path = returnTo.startsWith("/") ? returnTo : `/${returnTo}`;
    return `${path}${path.includes("?") ? "&" : "?"}apple_reauth=1`;
  },

  async listCalendars(userId: string): Promise<CalendarRef[]> {
    const client = await loadClient(userId);
    if (!client) return [];
    const calendars = await client.fetchCalendars();
    return calendars
      .filter((c) => Array.isArray(c.components) && c.components.includes("VEVENT"))
      .map((c) => ({
        calendarId: c.url,
        displayName:
          typeof c.displayName === "string" ? c.displayName : null,
        components: (c.components ?? []).filter(
          (comp): comp is "VEVENT" | "VTODO" => comp === "VEVENT" || comp === "VTODO",
        ),
      }));
  },

  async createCalendar(userId: string, name: string): Promise<CalendarRef> {
    const client = await loadClient(userId);
    if (!client) {
      throw new Error("Apple CalDAV client unavailable for user");
    }
    // 기본 calendar-home-set URL을 fetchCalendars로 추정하거나 client.account에서 가져온다
    // tsdav는 createDAVClient 결과에 account 정보를 포함하지 않을 수 있어, 다음 우회를 사용:
    //  - 첫 fetchCalendars로 home URL 추출 (각 캘린더의 url에서 부모 path)
    //  - 신규 URL: <home>/<random uuid>/
    const calendars = await client.fetchCalendars();
    if (calendars.length === 0) {
      // 최초 사용자라 캘린더가 0개인 경우는 거의 없지만 안전 폴백
      throw new Error("Apple CalDAV: cannot derive calendar-home URL (no existing calendars)");
    }
    const sample = calendars[0].url;
    // sample: https://p<digits>-caldav.icloud.com:443/<userId>/calendars/<calId>/
    const home = sample.replace(/[^/]+\/?$/, ""); // 마지막 segment 제거
    const newId = `trip-planner-${Date.now().toString(36)}`;
    const newUrl = `${home}${newId}/`;
    const responses = await client.makeCalendar({
      url: newUrl,
      props: {
        displayname: name,
        "supported-calendar-component-set": {
          _attributes: { "xmlns:C": "urn:ietf:params:xml:ns:caldav" },
          comp: { _attributes: { name: "VEVENT" } },
        },
      },
    });
    const ok = responses.some(
      (r) => typeof r.status === "number" && r.status >= 200 && r.status < 300,
    );
    if (!ok) {
      throw new Error("MKCALENDAR did not return 2xx");
    }
    return {
      calendarId: newUrl,
      displayName: name,
      components: ["VEVENT"],
    };
  },

  async putEvent(
    userId: string,
    calendarId: string,
    ics: string,
  ): Promise<ExternalEventRef> {
    const client = await loadClient(userId);
    if (!client) {
      throw new Error("Apple CalDAV client unavailable for user");
    }
    // CalDAV 일관성: filename = ICS의 UID (#460 fix). 호출자가 ICS UID를 명시
    // 했다면 같은 값을 filename에 사용해 update·delete 시 URL 추정이 가능.
    const uid = extractIcsUid(ics) ?? randomUUID();
    const filename = `${uid}.ics`;
    const res = await client.createCalendarObject({
      calendar: { url: calendarId } as Parameters<typeof client.createCalendarObject>[0]["calendar"],
      filename,
      iCalString: ics,
    });
    if (!res.ok) {
      const err = new Error(`createCalendarObject failed status=${res.status}`);
      (err as Error & { status?: number }).status = res.status;
      throw err;
    }
    const objectUrl = res.headers.get("location") ?? `${calendarId}${filename}`;
    const etag = res.headers.get("etag");
    return {
      externalEventId: objectUrl,
      etag: etag ?? null,
    };
  },

  async updateEvent(
    userId: string,
    ref: ExternalEventRef,
    ics: string,
  ): Promise<ExternalEventRef> {
    const client = await loadClient(userId);
    if (!client) {
      throw new Error("Apple CalDAV client unavailable for user");
    }
    const res = await client.updateCalendarObject({
      calendarObject: {
        url: ref.externalEventId,
        etag: ref.etag ?? "",
        data: ics,
      },
    });
    if (!res.ok) {
      const err = new Error(`updateCalendarObject failed status=${res.status}`);
      (err as Error & { status?: number }).status = res.status;
      throw err;
    }
    const newEtag = res.headers.get("etag");
    return {
      externalEventId: ref.externalEventId,
      etag: newEtag ?? null,
    };
  },

  async deleteEvent(userId: string, ref: ExternalEventRef): Promise<void> {
    const client = await loadClient(userId);
    if (!client) {
      throw new Error("Apple CalDAV client unavailable for user");
    }
    const res = await client.deleteCalendarObject({
      calendarObject: {
        url: ref.externalEventId,
        etag: ref.etag ?? "",
      },
    });
    if (!res.ok) {
      const err = new Error(`deleteCalendarObject failed status=${res.status}`);
      (err as Error & { status?: number }).status = res.status;
      throw err;
    }
  },

  async upsertMemberAcl(): Promise<void> {
    // capability "manual" — Apple은 멤버 초대 API 미제공. 호출되어선 안 되지만 안전망.
    // service.reconcileMemberAcl이 capability autoMemberAcl !== "auto"이면 skip하므로
    // 본 메서드는 정상 흐름에선 호출되지 않는다.
  },

  async revokeMemberAcl(): Promise<RevokeAclResult> {
    return {
      revoked: false,
      retainedReason: "Apple은 capability manual — 사용자가 외부 Calendar 앱에서 직접 회수",
    };
  },

  classifyError(err: unknown): CalendarErrorCode | null {
    const status = extractStatus(err);
    if (status === 401) return "auth_invalid";
    if (status === 412) return "precondition_failed";
    if ((status !== null && status >= 500) || isNetworkError(err)) {
      return "transient_failure";
    }
    if (status === 429) return "transient_failure";
    return null;
  },
};
