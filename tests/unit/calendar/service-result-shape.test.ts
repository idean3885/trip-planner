/**
 * spec 024 (#416) — service.ts 메서드가 라우트가 기대하는 결과 union 모양으로 반환하는지 검증.
 *
 * 회귀 0 검증의 핵심 — 라우트는 NextResponse.json(result.body, { status: result.status })
 * 한 줄로 응답을 만든다. 따라서 service가 반환하는 도메인 케이스(권한 부족, 미링크 등)가
 * 정확한 status/error 코드를 가져야 한다.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TripRole } from "@prisma/client";

const findUniqueTripCalendarLink = vi.fn();
const findUniqueTrip = vi.fn();
const findFirstTripCalendarLink = vi.fn();
const tripMemberFindUnique = vi.fn();
const memberFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tripCalendarLink: {
      findUnique: (...a: unknown[]) => findUniqueTripCalendarLink(...a),
      findFirst: (...a: unknown[]) => findFirstTripCalendarLink(...a),
    },
    trip: { findUnique: (...a: unknown[]) => findUniqueTrip(...a) },
    tripMember: { findMany: vi.fn(), findUnique: (...a: unknown[]) => tripMemberFindUnique(...a) },
    user: { findUnique: (...a: unknown[]) => memberFindUnique(...a) },
    memberCalendarSubscription: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getTripMember: vi.fn(),
}));

vi.mock("@/lib/gcal/auth", () => ({
  hasCalendarScope: vi.fn(),
  buildConsentRedirectUrl: vi.fn((p: string) => `https://example/oauth?return=${p}`),
}));

vi.mock("@/lib/gcal/client", () => ({
  getCalendarClient: vi.fn(),
  classifyError: vi.fn(),
  getStatus: vi.fn(),
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

vi.mock("@/lib/gcal/sync", () => ({
  syncActivities: vi.fn(),
}));

import * as service from "@/lib/calendar/service";
import { getTripMember } from "@/lib/auth-helpers";
import { hasCalendarScope } from "@/lib/gcal/auth";

const getTripMemberMock = vi.mocked(getTripMember);
const hasCalendarScopeMock = vi.mocked(hasCalendarScope);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("service.connectCalendar — 결과 union", () => {
  it("멤버 아님 → kind=error, status=403, body.error=not_a_member", async () => {
    getTripMemberMock.mockResolvedValue(null);
    const result = await service.connectCalendar({ userId: "u1", tripId: 1 });
    expect(result.kind).toBe("error");
    expect(result.status).toBe(403);
    expect(result.body).toEqual({ error: "not_a_member" });
  });

  it("OWNER 아님 → kind=error, status=403, body.error=owner_only", async () => {
    getTripMemberMock.mockResolvedValue({
      id: 1,
      tripId: 1,
      userId: "u1",
      role: TripRole.HOST,
    } as Awaited<ReturnType<typeof getTripMember>>);
    const result = await service.connectCalendar({ userId: "u1", tripId: 1 });
    expect(result.kind).toBe("error");
    expect(result.status).toBe(403);
    expect(result.body).toEqual({ error: "owner_only" });
  });

  it("scope 없음 → kind=consent_required, status=409, body.error=consent_required", async () => {
    getTripMemberMock.mockResolvedValue({
      id: 1,
      tripId: 1,
      userId: "u1",
      role: TripRole.OWNER,
    } as Awaited<ReturnType<typeof getTripMember>>);
    hasCalendarScopeMock.mockResolvedValue(false);
    const result = await service.connectCalendar({ userId: "u1", tripId: 1 });
    expect(result.kind).toBe("consent_required");
    expect(result.status).toBe(409);
    expect((result.body as { error: string }).error).toBe("consent_required");
    expect((result.body as { authorizationUrl?: string }).authorizationUrl).toContain(
      "/trips/1?gcal=link-ready",
    );
  });
});

describe("service.disconnectCalendar — 결과 union", () => {
  it("OWNER 아님 → owner_only 403", async () => {
    getTripMemberMock.mockResolvedValue({
      id: 1,
      tripId: 1,
      userId: "u1",
      role: TripRole.HOST,
    } as Awaited<ReturnType<typeof getTripMember>>);
    const result = await service.disconnectCalendar({ userId: "u1", tripId: 1 });
    expect(result.status).toBe(403);
    expect(result.body).toEqual({ error: "owner_only" });
  });

  it("OWNER이지만 link 없음 → not_linked 404", async () => {
    getTripMemberMock.mockResolvedValue({
      id: 1,
      tripId: 1,
      userId: "u1",
      role: TripRole.OWNER,
    } as Awaited<ReturnType<typeof getTripMember>>);
    findUniqueTripCalendarLink.mockResolvedValue(null);
    const result = await service.disconnectCalendar({ userId: "u1", tripId: 1 });
    expect(result.status).toBe(404);
    expect(result.body).toEqual({ error: "not_linked" });
  });
});

describe("service.getCalendarStatus — 결과 union", () => {
  it("멤버 아님 → not_a_member 403", async () => {
    getTripMemberMock.mockResolvedValue(null);
    const result = await service.getCalendarStatus({ userId: "u1", tripId: 1 });
    expect(result.status).toBe(403);
    expect(result.body).toEqual({ error: "not_a_member" });
  });

  it("link 없음 → linked:false + scopeGranted 200", async () => {
    getTripMemberMock.mockResolvedValue({
      id: 1,
      tripId: 1,
      userId: "u1",
      role: TripRole.HOST,
    } as Awaited<ReturnType<typeof getTripMember>>);
    findUniqueTripCalendarLink.mockResolvedValue(null);
    hasCalendarScopeMock.mockResolvedValue(true);
    const result = await service.getCalendarStatus({ userId: "u1", tripId: 1 });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ linked: false, scopeGranted: true });
  });
});

describe("service.syncCalendar — 결과 union", () => {
  it("GUEST → editor_only 403", async () => {
    getTripMemberMock.mockResolvedValue({
      id: 1,
      tripId: 1,
      userId: "u1",
      role: TripRole.GUEST,
    } as Awaited<ReturnType<typeof getTripMember>>);
    const result = await service.syncCalendar(
      { userId: "u1", tripId: 1 },
      { tripUrl: "https://x" },
    );
    expect(result.status).toBe(403);
    expect(result.body).toEqual({ error: "editor_only" });
  });

  it("HOST + link 없음 → not_linked 404", async () => {
    getTripMemberMock.mockResolvedValue({
      id: 1,
      tripId: 1,
      userId: "u1",
      role: TripRole.HOST,
    } as Awaited<ReturnType<typeof getTripMember>>);
    findUniqueTripCalendarLink.mockResolvedValue(null);
    const result = await service.syncCalendar(
      { userId: "u1", tripId: 1 },
      { tripUrl: "https://x" },
    );
    expect(result.status).toBe(404);
    expect(result.body).toEqual({ error: "not_linked" });
  });
});

describe("service.subscribeCalendar/unsubscribeCalendar — 결과 union", () => {
  it("subscribe: 멤버 아님 → not_a_member 403", async () => {
    getTripMemberMock.mockResolvedValue(null);
    const result = await service.subscribeCalendar({ userId: "u1", tripId: 1 });
    expect(result.status).toBe(403);
    expect(result.body).toEqual({ error: "not_a_member" });
  });

  it("subscribe: link 없음 → not_linked 404", async () => {
    getTripMemberMock.mockResolvedValue({
      id: 1,
      tripId: 1,
      userId: "u1",
      role: TripRole.GUEST,
    } as Awaited<ReturnType<typeof getTripMember>>);
    findUniqueTripCalendarLink.mockResolvedValue(null);
    const result = await service.subscribeCalendar({ userId: "u1", tripId: 1 });
    expect(result.status).toBe(404);
    expect(result.body).toEqual({ error: "not_linked" });
  });

  it("unsubscribe: 멤버 아님 → not_a_member 403", async () => {
    getTripMemberMock.mockResolvedValue(null);
    const result = await service.unsubscribeCalendar({ userId: "u1", tripId: 1 });
    expect(result.status).toBe(403);
    expect(result.body).toEqual({ error: "not_a_member" });
  });
});
