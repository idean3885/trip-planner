/**
 * GET /api/trips/[id]/gcal/status — 미연결 응답 정본화 테스트 (spec 020).
 *
 * 핵심 회귀 방지:
 *   TripCalendarLink가 없으면 본인 per-user GCalLink 존재 여부와 관계없이 {linked:false}.
 *   (이전 레거시 폴백이 linked:true를 돌려줘 호스트 UI에서 404 not_linked가 발생했다.)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockAuth, mockAuthHelpers, mockGcalAuth } = vi.hoisted(() => ({
  mockPrisma: {
    tripCalendarLink: { findUnique: vi.fn() },
    gCalLink: { findUnique: vi.fn() },
    memberCalendarSubscription: { findUnique: vi.fn() },
  },
  mockAuth: { auth: vi.fn() },
  mockAuthHelpers: { getTripMember: vi.fn() },
  mockGcalAuth: { hasCalendarScope: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/auth", () => mockAuth);
vi.mock("@/lib/auth-helpers", () => mockAuthHelpers);
vi.mock("@/lib/gcal/auth", () => mockGcalAuth);

import { GET } from "@/app/api/trips/[id]/gcal/status/route";

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.auth.mockResolvedValue({ user: { id: "user-host" } });
  mockAuthHelpers.getTripMember.mockResolvedValue({ role: "HOST" });
  mockGcalAuth.hasCalendarScope.mockResolvedValue(false);
});

function reqParams() {
  return { params: Promise.resolve({ id: "5" }) };
}

describe("GET /api/trips/[id]/gcal/status — spec 020 미연결 정본화", () => {
  it("TripCalendarLink 없음 + per-user GCalLink 없음 → linked:false", async () => {
    mockPrisma.tripCalendarLink.findUnique.mockResolvedValue(null);
    mockPrisma.gCalLink.findUnique.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost/api/trips/5/gcal/status") as never, reqParams());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ linked: false, scopeGranted: false });
  });

  it("TripCalendarLink 없음 + per-user GCalLink 존재 → linked:false (레거시 폴백 제거)", async () => {
    mockPrisma.tripCalendarLink.findUnique.mockResolvedValue(null);
    // 레거시 per-user 링크가 남아있어도 응답 본문에는 반영되지 않아야 한다.
    mockPrisma.gCalLink.findUnique.mockResolvedValue({
      calendarType: "DEDICATED",
      calendarId: "legacy-cal-id",
      calendarName: "legacy",
      lastSyncedAt: new Date(),
      lastError: null,
      skippedCount: 0,
    });
    mockGcalAuth.hasCalendarScope.mockResolvedValue(true);

    const res = await GET(new Request("http://localhost/api/trips/5/gcal/status") as never, reqParams());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ linked: false, scopeGranted: true });
    // 폴백 경로가 제거됐으므로 per-user GCalLink 조회는 호출되지 않아야 한다.
    expect(mockPrisma.gCalLink.findUnique).not.toHaveBeenCalled();
  });

  it("TripCalendarLink 존재 → linked:true (정상 경로, 기존 동작 보존)", async () => {
    mockPrisma.tripCalendarLink.findUnique.mockResolvedValue({
      id: 1,
      calendarId: "shared-cal-id",
      calendarName: "신혼여행 (trip-planner)",
      lastSyncedAt: new Date("2026-04-22T00:00:00Z"),
      lastError: null,
      skippedCount: 0,
    });
    mockPrisma.memberCalendarSubscription.findUnique.mockResolvedValue({
      status: "NOT_ADDED",
      lastError: null,
    });

    const res = await GET(new Request("http://localhost/api/trips/5/gcal/status") as never, reqParams());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.linked).toBe(true);
    expect(data.link.calendarId).toBe("shared-cal-id");
  });

  it("인증 없음 → 401", async () => {
    mockAuth.auth.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/trips/5/gcal/status") as never, reqParams());
    expect(res.status).toBe(401);
  });

  it("동행자 아님 → 403", async () => {
    mockAuthHelpers.getTripMember.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/trips/5/gcal/status") as never, reqParams());
    expect(res.status).toBe(403);
  });
});
