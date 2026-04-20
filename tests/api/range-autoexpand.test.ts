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

  it("startDate 이전 date → startDate 확장 (sortOrder 컬럼 없음, 재계산 불필요)", async () => {
    mockPrisma.trip.findUniqueOrThrow.mockResolvedValue(TRIP);

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
    // sortOrder 컬럼이 사라졌으므로 day.update 재계산 호출 없음
    expect(mockPrisma.day.update).not.toHaveBeenCalled();
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
