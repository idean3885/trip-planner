/**
 * v2 응답 스키마 테스트 — /api/v2/trips/[id]/days GET이 dayNumber 키를 포함하고
 * sortOrder 키는 제외하는지 검증.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockAuthHelpers } = vi.hoisted(() => ({
  mockPrisma: {
    day: { findMany: vi.fn() },
    trip: { findUnique: vi.fn() },
  },
  mockAuthHelpers: {
    getAuthUserId: vi.fn(),
    getTripMember: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth-helpers", () => mockAuthHelpers);

import { GET } from "@/app/api/v2/trips/[id]/days/route";

beforeEach(() => vi.clearAllMocks());

function params() {
  return { params: Promise.resolve({ id: "1" }) };
}

describe("v2 — GET /api/v2/trips/{id}/days", () => {
  it("응답에 dayNumber 정수 포함, sortOrder 제외", async () => {
    mockAuthHelpers.getAuthUserId.mockResolvedValue("user1");
    mockAuthHelpers.getTripMember.mockResolvedValue({ role: "OWNER" });
    mockPrisma.trip.findUnique.mockResolvedValue({
      startDate: new Date("2026-06-01T00:00:00Z"),
    });
    mockPrisma.day.findMany.mockResolvedValue([
      { id: 1, tripId: 1, date: new Date("2026-06-01T00:00:00Z") },
      { id: 2, tripId: 1, date: new Date("2026-06-03T00:00:00Z") },
    ]);

    const res = await GET(new Request("http://localhost/api/v2/trips/1/days"), params());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data[0].dayNumber).toBe(1);
    // 06-03 - 06-01 + 1 = 3 (gap-aware)
    expect(data[1].dayNumber).toBe(3);
    expect(data[0]).not.toHaveProperty("sortOrder");
  });
});
