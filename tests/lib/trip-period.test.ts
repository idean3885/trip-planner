import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * trip-period 헬퍼 단위 테스트.
 *
 * prisma.day.aggregate를 mock 처리해 헬퍼 자체 로직만 검증한다. 일정 0건·1건·N건
 * 케이스에서 derived 기간이 의도대로 산출되는지 본다.
 */

const aggregateMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    day: {
      aggregate: (...args: unknown[]) => aggregateMock(...args),
    },
  },
}));

import { getDerivedPeriod } from "@/lib/trip-period";

beforeEach(() => {
  aggregateMock.mockReset();
});

describe("getDerivedPeriod", () => {
  it("일정 0건이면 startDate·endDate 모두 null", async () => {
    aggregateMock.mockResolvedValue({
      _min: { date: null },
      _max: { date: null },
    });
    const result = await getDerivedPeriod(1);
    expect(result).toEqual({ startDate: null, endDate: null });
  });

  it("일정 1건이면 같은 날짜를 startDate·endDate로 반환", async () => {
    const date = new Date("2026-06-07T00:00:00Z");
    aggregateMock.mockResolvedValue({
      _min: { date },
      _max: { date },
    });
    const result = await getDerivedPeriod(1);
    expect(result.startDate).toEqual(date);
    expect(result.endDate).toEqual(date);
  });

  it("일정 N건이면 min/max 날짜 반환", async () => {
    const min = new Date("2026-06-07T00:00:00Z");
    const max = new Date("2026-06-21T00:00:00Z");
    aggregateMock.mockResolvedValue({
      _min: { date: min },
      _max: { date: max },
    });
    const result = await getDerivedPeriod(1);
    expect(result.startDate).toEqual(min);
    expect(result.endDate).toEqual(max);
  });

  it("prisma aggregate 호출에 tripId where 절을 전달", async () => {
    aggregateMock.mockResolvedValue({
      _min: { date: null },
      _max: { date: null },
    });
    await getDerivedPeriod(42);
    expect(aggregateMock).toHaveBeenCalledWith({
      where: { tripId: 42 },
      _min: { date: true },
      _max: { date: true },
    });
  });
});
