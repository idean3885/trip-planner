import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockAuthHelpers } = vi.hoisted(() => ({
  mockPrisma: {
    day: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    trip: { findUnique: vi.fn() },
    tripMember: { findUnique: vi.fn() },
  },
  mockAuthHelpers: {
    getAuthUserId: vi.fn(),
    getTripMember: vi.fn(),
    canEdit: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth-helpers", () => mockAuthHelpers);

import { GET } from "@/app/api/trips/[id]/days/[dayId]/route";

const mockAuth = mockAuthHelpers.getAuthUserId;
const mockMember = mockAuthHelpers.getTripMember;

function params(overrides = {}) {
  return { params: Promise.resolve({ id: "1", dayId: "43", ...overrides }) };
}

describe("GET /days/{dayId}", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), params());
    expect(res.status).toBe(401);
  });

  it("returns 403 when not a member", async () => {
    mockAuth.mockResolvedValue("user1");
    mockMember.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), params());
    expect(res.status).toBe(403);
  });

  it("returns 404 when day not found", async () => {
    mockAuth.mockResolvedValue("user1");
    mockMember.mockResolvedValue({ role: "HOST" });
    mockPrisma.trip.findUnique.mockResolvedValue({
      startDate: new Date("2026-06-01T00:00:00Z"),
    });
    mockPrisma.day.findUnique.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), params());
    expect(res.status).toBe(404);
  });

  it("returns day with activities + sortOrder dynamically derived", async () => {
    mockAuth.mockResolvedValue("user1");
    mockMember.mockResolvedValue({ role: "HOST" });
    mockPrisma.trip.findUnique.mockResolvedValue({
      startDate: new Date("2026-06-01T00:00:00Z"),
    });
    const day = {
      id: 43,
      tripId: 1,
      date: new Date("2026-06-07T00:00:00Z"),
      content: "# Day 1",
      activities: [{ id: 1, title: "Visit", category: "SIGHTSEEING" }],
    };
    mockPrisma.day.findUnique.mockResolvedValue(day);

    const res = await GET(new Request("http://localhost"), params());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(43);
    expect(data.activities).toHaveLength(1);
    expect(data.content).toBe("# Day 1");
    // 06-07 - 06-01 + 1 = 7
    expect(data.sortOrder).toBe(7);
  });
});
