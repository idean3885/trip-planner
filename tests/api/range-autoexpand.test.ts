/**
 * Trip 범위 자동 확장 테스트 (US3) — Day POST/PUT 시 Trip 범위 밖 date면
 * Trip.startDate/endDate가 자동 확장되고 모든 Day의 sortOrder가 재계산되는지 검증.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    day: { findMany: vi.fn(), update: vi.fn(), create: vi.fn() },
    trip: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { expandTripRangeIfNeeded } from "@/lib/day-number";

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.day.findMany.mockResolvedValue([]);
});

describe("expandTripRangeIfNeeded", () => {
  const TRIP = {
    id: 1,
    startDate: new Date("2026-06-10T00:00:00Z"),
    endDate: new Date("2026-06-20T00:00:00Z"),
  };

  it("범위 안 date면 no-op (expanded=false)", async () => {
    mockPrisma.trip.findUniqueOrThrow.mockResolvedValue(TRIP);
    const result = await expandTripRangeIfNeeded(
      mockPrisma as never,
      1,
      new Date("2026-06-15T00:00:00Z"),
    );
    expect(result.expanded).toBe(false);
    expect(mockPrisma.trip.update).not.toHaveBeenCalled();
  });

  it("startDate 이전 date → startDate 확장 + 모든 Day sortOrder 재계산", async () => {
    mockPrisma.trip.findUniqueOrThrow.mockResolvedValue(TRIP);
    mockPrisma.day.findMany.mockResolvedValue([
      { id: 11, date: new Date("2026-06-10T00:00:00Z") },
      { id: 12, date: new Date("2026-06-11T00:00:00Z") },
    ]);

    const result = await expandTripRangeIfNeeded(
      mockPrisma as never,
      1,
      new Date("2026-06-08T00:00:00Z"),
    );
    expect(result.expanded).toBe(true);
    expect(result.trip.startDate).toEqual(new Date("2026-06-08T00:00:00Z"));
    expect(mockPrisma.trip.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        startDate: new Date("2026-06-08T00:00:00Z"),
      }),
    });
    // 기존 Day 2개 sortOrder 재계산: 06-10 → 3, 06-11 → 4 (start = 06-08)
    expect(mockPrisma.day.update).toHaveBeenCalledWith({
      where: { id: 11 },
      data: { sortOrder: 3 },
    });
    expect(mockPrisma.day.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: { sortOrder: 4 },
    });
  });

  it("endDate 이후 date → endDate만 확장", async () => {
    mockPrisma.trip.findUniqueOrThrow.mockResolvedValue(TRIP);

    const result = await expandTripRangeIfNeeded(
      mockPrisma as never,
      1,
      new Date("2026-06-25T00:00:00Z"),
    );
    expect(result.expanded).toBe(true);
    expect(result.trip.startDate).toEqual(TRIP.startDate);
    expect(result.trip.endDate).toEqual(new Date("2026-06-25T00:00:00Z"));
  });
});
