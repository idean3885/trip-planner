/**
 * spec 025 (#417) — service.connectAppleCalendar의 capability "manual" 분기 검증.
 *
 * Apple link 연결 시:
 *  - 멤버 ACL 자동 호출(provider.upsertMemberAcl) 0회
 *  - manualAclGuidance 텍스트가 응답 body에 포함
 *  - members 배열은 "granted"로 표기되지만 실제 ACL은 사용자가 직접 처리
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TripRole } from "@prisma/client";

// 외부 의존 mock
vi.mock("tsdav", () => ({ createDAVClient: vi.fn() }));
vi.mock("@/lib/gcal/client", () => ({
  getCalendarClient: vi.fn(),
  classifyError: vi.fn(),
  getStatus: vi.fn(),
}));
vi.mock("@/lib/gcal/auth", () => ({
  hasCalendarScope: vi.fn(),
  buildConsentRedirectUrl: vi.fn(),
}));
vi.mock("@/lib/gcal/acl", () => ({
  upsertAcl: vi.fn(),
  deleteAcl: vi.fn(),
  mapRoleToAcl: (r: TripRole) =>
    r === TripRole.OWNER ? "owner" : r === TripRole.HOST ? "writer" : "reader",
}));
vi.mock("@/lib/gcal/format", () => ({
  dedicatedCalendarName: (t: string) => `${t} (trip-planner)`,
}));
vi.mock("@/lib/gcal/sync", () => ({ syncActivities: vi.fn() }));

// Prisma mock
const tripCalendarLinkFindUnique = vi.fn();
const tripCalendarLinkCreate = vi.fn();
const tripFindUnique = vi.fn();
const tripMemberFindMany = vi.fn();
const appleCredFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tripCalendarLink: {
      findUnique: (...a: unknown[]) => tripCalendarLinkFindUnique(...a),
      create: (...a: unknown[]) => tripCalendarLinkCreate(...a),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    trip: { findUnique: (...a: unknown[]) => tripFindUnique(...a) },
    tripMember: {
      findMany: (...a: unknown[]) => tripMemberFindMany(...a),
      findUnique: vi.fn(),
    },
    user: { findUnique: vi.fn() },
    memberCalendarSubscription: { findUnique: vi.fn(), upsert: vi.fn() },
    appleCalendarCredential: {
      findUnique: (...a: unknown[]) => appleCredFindUnique(...a),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({ getTripMember: vi.fn() }));

// appleProvider 일부 메서드 mock — capability·createCalendar·hasValidAuth만 stub
vi.mock("@/lib/calendar/provider/apple", () => ({
  appleProvider: {
    id: "APPLE",
    capabilities: {
      autoMemberAcl: "manual",
      supportsCalendarCreation: true,
      supportsCalendarSelection: true,
    },
    hasValidAuth: vi.fn(),
    createCalendar: vi.fn(),
    upsertMemberAcl: vi.fn(),
    revokeMemberAcl: vi.fn(),
    classifyError: vi.fn(),
  },
}));

import { connectAppleCalendar } from "@/lib/calendar/service";
import { getTripMember } from "@/lib/auth-helpers";
import { appleProvider } from "@/lib/calendar/provider/apple";

const getTripMemberMock = vi.mocked(getTripMember);

beforeEach(() => {
  vi.resetAllMocks();
  // appleProvider.capabilities는 vi.resetAllMocks가 건드리지 않는 plain object
  Object.assign(appleProvider, {
    id: "APPLE",
    capabilities: {
      autoMemberAcl: "manual",
      supportsCalendarCreation: true,
      supportsCalendarSelection: true,
    },
  });
});

describe("connectAppleCalendar — capability manual 분기", () => {
  it("OWNER 아님 → owner_only 403", async () => {
    getTripMemberMock.mockResolvedValue({
      id: 1,
      tripId: 1,
      userId: "u1",
      role: TripRole.HOST,
    } as Awaited<ReturnType<typeof getTripMember>>);
    const r = await connectAppleCalendar({ userId: "u1", tripId: 1 });
    expect(r.status).toBe(403);
    expect(r.body).toEqual({ error: "owner_only" });
  });

  it("hasValidAuth false → apple_not_authenticated 409 + reauthUrl", async () => {
    getTripMemberMock.mockResolvedValue({
      id: 1,
      tripId: 1,
      userId: "u1",
      role: TripRole.OWNER,
    } as Awaited<ReturnType<typeof getTripMember>>);
    vi.mocked(appleProvider.hasValidAuth).mockResolvedValue(false);
    const r = await connectAppleCalendar({ userId: "u1", tripId: 1 });
    expect(r.status).toBe(409);
    expect((r.body as { error: string }).error).toBe("apple_not_authenticated");
    expect((r.body as { reauthUrl?: string }).reauthUrl).toContain(
      "/trips/1/calendar/connect-apple",
    );
  });

  it("멤버 2명 trip 첫 연결 → manualAclGuidance 포함, upsertMemberAcl 호출 0회", async () => {
    getTripMemberMock.mockResolvedValue({
      id: 1,
      tripId: 1,
      userId: "u1",
      role: TripRole.OWNER,
    } as Awaited<ReturnType<typeof getTripMember>>);
    vi.mocked(appleProvider.hasValidAuth).mockResolvedValue(true);
    tripFindUnique.mockResolvedValue({ id: 1, title: "신혼여행" });
    tripCalendarLinkFindUnique.mockResolvedValue(null);
    vi.mocked(appleProvider.createCalendar).mockResolvedValue({
      calendarId: "https://caldav.icloud.com/u1/calendars/trip-planner-abc/",
      displayName: "신혼여행 (trip-planner)",
      components: ["VEVENT"],
    });
    tripCalendarLinkCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 100,
      tripId: 1,
      ownerId: "u1",
      provider: "APPLE",
      calendarId: data.calendarId,
      calendarName: data.calendarName,
      lastSyncedAt: null,
      lastError: null,
      skippedCount: 0,
    }));
    tripMemberFindMany.mockResolvedValue([
      { userId: "u1", role: TripRole.OWNER, user: { id: "u1", email: "owner@example.com" } },
      { userId: "u2", role: TripRole.HOST, user: { id: "u2", email: "host@example.com" } },
      { userId: "u3", role: TripRole.GUEST, user: { id: "u3", email: "guest@example.com" } },
    ]);

    const r = await connectAppleCalendar({ userId: "u1", tripId: 1 });

    expect(r.status).toBe(200);
    const body = r.body as {
      status: string;
      manualAclGuidance?: string;
      members: Array<{ email: string }>;
    };
    expect(body.status).toBe("ok");
    expect(body.manualAclGuidance).toContain("host@example.com");
    expect(body.manualAclGuidance).toContain("guest@example.com");
    // upsertMemberAcl이 절대 호출되지 않는지 검증 (capability manual 핵심)
    expect(appleProvider.upsertMemberAcl).not.toHaveBeenCalled();
  });

  it("이미 GOOGLE link 존재 → already_linked_other_provider 409", async () => {
    getTripMemberMock.mockResolvedValue({
      id: 1,
      tripId: 1,
      userId: "u1",
      role: TripRole.OWNER,
    } as Awaited<ReturnType<typeof getTripMember>>);
    vi.mocked(appleProvider.hasValidAuth).mockResolvedValue(true);
    tripFindUnique.mockResolvedValue({ id: 1, title: "신혼여행" });
    tripCalendarLinkFindUnique.mockResolvedValue({
      id: 50,
      tripId: 1,
      provider: "GOOGLE",
      calendarId: "google-cal-id",
      calendarName: "기존",
      ownerId: "u1",
      lastSyncedAt: null,
      lastError: null,
      skippedCount: 0,
    });
    const r = await connectAppleCalendar({ userId: "u1", tripId: 1 });
    expect(r.status).toBe(409);
    expect((r.body as { error: string }).error).toBe("already_linked_other_provider");
    expect((r.body as { currentProvider: string }).currentProvider).toBe("GOOGLE");
  });

  it("멤버 0명 (오너 단독) → manualAclGuidance 부재", async () => {
    getTripMemberMock.mockResolvedValue({
      id: 1,
      tripId: 1,
      userId: "u1",
      role: TripRole.OWNER,
    } as Awaited<ReturnType<typeof getTripMember>>);
    vi.mocked(appleProvider.hasValidAuth).mockResolvedValue(true);
    tripFindUnique.mockResolvedValue({ id: 1, title: "혼자여행" });
    tripCalendarLinkFindUnique.mockResolvedValue(null);
    vi.mocked(appleProvider.createCalendar).mockResolvedValue({
      calendarId: "https://caldav.icloud.com/u1/calendars/trip-planner-solo/",
      displayName: "혼자여행 (trip-planner)",
      components: ["VEVENT"],
    });
    tripCalendarLinkCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 101,
      tripId: 1,
      ownerId: "u1",
      provider: "APPLE",
      calendarId: data.calendarId,
      calendarName: data.calendarName,
      lastSyncedAt: null,
      lastError: null,
      skippedCount: 0,
    }));
    tripMemberFindMany.mockResolvedValue([
      { userId: "u1", role: TripRole.OWNER, user: { id: "u1", email: "owner@example.com" } },
    ]);
    const r = await connectAppleCalendar({ userId: "u1", tripId: 1 });
    expect(r.status).toBe(200);
    const body = r.body as { manualAclGuidance?: string };
    expect(body.manualAclGuidance).toBeUndefined();
  });
});
