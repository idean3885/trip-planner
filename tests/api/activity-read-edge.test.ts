import { beforeEach, describe, expect, it, vi } from "vitest";

// #744 — 활동 읽기 엣지: 비인증·비멤버·없는 trip/day, 빈 컬렉션.
const { mockPrisma, mockAuthHelpers, mockTripPeriod } = vi.hoisted(() => ({
  mockPrisma: {
    trip: { findUnique: vi.fn() },
    day: {
      findUnique: vi.fn(),
      aggregate: vi
        .fn()
        .mockResolvedValue({ _min: { date: null }, _max: { date: null } }),
    },
    activity: { findMany: vi.fn() },
  },
  mockAuthHelpers: {
    getAuthUserId: vi.fn(),
    getTripMember: vi.fn(),
    canEdit: vi.fn(),
    isOwner: vi.fn(),
  },
  mockTripPeriod: { getResolvedPeriod: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth-helpers", () => mockAuthHelpers);
vi.mock("@/lib/trip-period", () => mockTripPeriod);
vi.mock("@/lib/calendar/auto-sync", () => ({
  triggerCalendarAutoSync: vi.fn(),
}));

import { GET as listActivities } from "@/app/api/trips/[id]/days/[dayId]/activities/route";
import { GET as getTrip } from "@/app/api/trips/[id]/route";

const tripParams = { params: Promise.resolve({ id: "5" }) };
const actParams = { params: Promise.resolve({ id: "5", dayId: "76" }) };

beforeEach(() => {
  vi.clearAllMocks();
  mockTripPeriod.getResolvedPeriod.mockResolvedValue({
    startDate: new Date("2026-06-07T00:00:00Z"),
    endDate: new Date("2026-06-21T00:00:00Z"),
  });
});

describe("활동 읽기 엣지 — 트립 GET", () => {
  it("미인증이면 401", async () => {
    mockAuthHelpers.getAuthUserId.mockResolvedValue(null);
    const res = await getTrip(
      new Request("http://localhost/api/trips/5"),
      tripParams,
    );
    expect(res.status).toBe(401);
  });

  it("비멤버면 403", async () => {
    mockAuthHelpers.getAuthUserId.mockResolvedValue("user1");
    mockAuthHelpers.getTripMember.mockResolvedValue(null);
    mockPrisma.trip.findUnique.mockResolvedValue({ id: 5, days: [] });
    const res = await getTrip(
      new Request("http://localhost/api/trips/5"),
      tripParams,
    );
    expect(res.status).toBe(403);
  });

  it("없는 여행이면 404", async () => {
    mockAuthHelpers.getAuthUserId.mockResolvedValue("user1");
    mockAuthHelpers.getTripMember.mockResolvedValue({ role: "HOST" });
    mockPrisma.trip.findUnique.mockResolvedValue(null);
    const res = await getTrip(
      new Request("http://localhost/api/trips/5"),
      tripParams,
    );
    expect(res.status).toBe(404);
  });
});

describe("활동 읽기 엣지 — 활동 목록 GET", () => {
  it("활동이 0개면 오류가 아니라 빈 배열", async () => {
    mockAuthHelpers.getAuthUserId.mockResolvedValue("user1");
    mockAuthHelpers.getTripMember.mockResolvedValue({ role: "HOST" });
    mockPrisma.activity.findMany.mockResolvedValue([]);
    const res = await listActivities(
      new Request("http://localhost/api/trips/5/days/76/activities"),
      actParams,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });

  it("비멤버면 403", async () => {
    mockAuthHelpers.getAuthUserId.mockResolvedValue("user1");
    mockAuthHelpers.getTripMember.mockResolvedValue(null);
    const res = await listActivities(
      new Request("http://localhost/api/trips/5/days/76/activities"),
      actParams,
    );
    expect(res.status).toBe(403);
  });
});
