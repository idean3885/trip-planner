import { beforeEach, describe, expect, it, vi } from "vitest";

// #744 — 트립 GET 활동 표현 확장(`?include=activities`) on/off 분기 검증.
const { mockPrisma, mockAuthHelpers, mockTripPeriod } = vi.hoisted(() => ({
  mockPrisma: {
    trip: { findUnique: vi.fn() },
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

import { GET } from "@/app/api/trips/[id]/route";

const params = { params: Promise.resolve({ id: "5" }) };

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthHelpers.getAuthUserId.mockResolvedValue("user1");
  mockAuthHelpers.getTripMember.mockResolvedValue({ role: "HOST" });
  mockTripPeriod.getResolvedPeriod.mockResolvedValue({
    startDate: new Date("2026-06-07T00:00:00Z"),
    endDate: new Date("2026-06-21T00:00:00Z"),
  });
});

describe("GET /api/trips/{id} — include=activities 분기", () => {
  it("미지정 시 활동 개수(_count)만 include 한다(하위호환)", async () => {
    mockPrisma.trip.findUnique.mockResolvedValue({
      id: 5,
      title: "신혼여행",
      days: [
        {
          id: 76,
          date: new Date("2026-06-07T00:00:00Z"),
          _count: { activities: 3 },
        },
      ],
      tripMembers: [],
    });

    const res = await GET(new Request("http://localhost/api/trips/5"), params);
    expect(res.status).toBe(200);

    const include = mockPrisma.trip.findUnique.mock.calls[0][0].include;
    expect(include.days.include).toEqual({
      _count: { select: { activities: true } },
    });

    const data = await res.json();
    expect(data.days[0]._count.activities).toBe(3);
    expect(data.days[0].activities).toBeUndefined();
    expect(data.days[0].sortOrder).toBe(1);
  });

  it("?include=activities 지정 시 활동 전체 표현을 include 한다", async () => {
    mockPrisma.trip.findUnique.mockResolvedValue({
      id: 5,
      title: "신혼여행",
      days: [
        {
          id: 76,
          date: new Date("2026-06-07T00:00:00Z"),
          activities: [
            { id: 160, dayId: 76, title: "✈️ 인천→리스본", sortOrder: 1 },
          ],
        },
      ],
      tripMembers: [],
    });

    const res = await GET(
      new Request("http://localhost/api/trips/5?include=activities"),
      params,
    );
    expect(res.status).toBe(200);

    const include = mockPrisma.trip.findUnique.mock.calls[0][0].include;
    expect(include.days.include).toEqual({
      activities: { orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }] },
    });

    const data = await res.json();
    expect(data.days[0].activities).toHaveLength(1);
    expect(data.days[0].activities[0].id).toBe(160);
  });

  it("쉼표 목록에 activities 가 포함되면 인식한다", async () => {
    mockPrisma.trip.findUnique.mockResolvedValue({
      id: 5,
      days: [],
      tripMembers: [],
    });
    await GET(
      new Request("http://localhost/api/trips/5?include=foo,activities"),
      params,
    );
    const include = mockPrisma.trip.findUnique.mock.calls[0][0].include;
    expect(include.days.include).toHaveProperty("activities");
  });
});
