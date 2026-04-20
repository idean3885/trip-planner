/**
 * v1 호환 테스트 — /api/trips/[id]/days GET이 Day 응답에 sortOrder를 포함하는지 검증.
 * MCP 클라이언트(`mcp/trip_mcp/planner.py`)가 day.get('sortOrder')에 의존.
 * v2.7.0 이후에도 v1 응답 스키마는 무변경이어야 한다.
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

import { GET } from "@/app/api/trips/[id]/days/route";

beforeEach(() => vi.clearAllMocks());

function params() {
  return { params: Promise.resolve({ id: "1" }) };
}

describe("v1 호환 — GET /api/trips/{id}/days", () => {
  it("응답에 sortOrder 키 정수 포함 (MCP 호환, dayNumber 동적 계산)", async () => {
    mockAuthHelpers.getAuthUserId.mockResolvedValue("user1");
    mockAuthHelpers.getTripMember.mockResolvedValue({ role: "OWNER" });
    mockPrisma.trip.findUnique.mockResolvedValue({
      startDate: new Date("2026-06-01T00:00:00Z"),
    });
    mockPrisma.day.findMany.mockResolvedValue([
      { id: 1, tripId: 1, date: new Date("2026-06-01T00:00:00Z") },
      { id: 2, tripId: 1, date: new Date("2026-06-03T00:00:00Z") },
    ]);

    const res = await GET(new Request("http://localhost/api/trips/1/days"), params());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toHaveProperty("sortOrder");
    expect(data[0].sortOrder).toBe(1);
    // 06-03 - 06-01 + 1 = 3 (gap-aware)
    expect(data[1].sortOrder).toBe(3);
    // dayNumber 키는 v1에 미포함
    expect(data[0]).not.toHaveProperty("dayNumber");
  });
});
