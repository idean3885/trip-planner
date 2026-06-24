/**
 * #669 — GET /days 윈도우 모드(activities + from/to). 범위 내 Day 의 활동을
 * client 캐시 형태로 응답한다. 쿼리 없으면 기존 경량 인덱스.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, mockAuthHelpers, mockPeriod } = vi.hoisted(() => ({
  mockPrisma: {
    day: { findMany: vi.fn() },
    trip: { findUnique: vi.fn() },
    tripMember: { findUnique: vi.fn() },
  },
  mockAuthHelpers: {
    getAuthUserId: vi.fn(),
    getTripMember: vi.fn(),
    canEdit: vi.fn(),
  },
  mockPeriod: { getResolvedPeriod: vi.fn(), getDerivedPeriodTx: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth-helpers", () => mockAuthHelpers);
vi.mock("@/lib/trip-period", () => mockPeriod);

import { GET } from "@/app/api/trips/[id]/days/route";

const params = { params: Promise.resolve({ id: "1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthHelpers.getAuthUserId.mockResolvedValue(7);
  mockAuthHelpers.getTripMember.mockResolvedValue({ role: "OWNER" });
  mockPrisma.trip.findUnique.mockResolvedValue({ id: 1 });
  mockPeriod.getResolvedPeriod.mockResolvedValue({
    startDate: new Date("2026-06-07"),
    endDate: new Date("2026-06-21"),
  });
});

describe("GET /days 윈도우 모드", () => {
  it("activities + from/to → 범위 Day 의 활동을 캐시 형태로 응답", async () => {
    mockPrisma.day.findMany.mockResolvedValue([
      {
        id: 10,
        date: new Date("2026-06-07T00:00:00.000Z"),
        activities: [
          {
            id: 100,
            title: "리스본 도착",
            category: "TRANSPORT",
            startTime: new Date("2026-06-07T09:00:00.000Z"),
            startTimezone: "Europe/Lisbon",
            endTime: null,
            endTimezone: null,
            location: null,
            memo: null,
            cost: 120,
            currency: "EUR",
            paymentTiming: "ON_SITE",
            sortOrder: 0,
          },
        ],
      },
    ]);
    const res = await GET(
      new Request(
        "http://localhost/api/trips/1/days?activities=1&from=2026-06-04&to=2026-06-10",
      ),
      params,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(10);
    expect(body[0].activities[0].title).toBe("리스본 도착");
    expect(body[0].activities[0].cost).toBe("120"); // Decimal/number → 문자열
    // 날짜 범위 필터 + 활동 include 가 쿼리에 전달됐다.
    const arg = mockPrisma.day.findMany.mock.calls[0][0];
    expect(arg.where.date.gte).toBeInstanceOf(Date);
    expect(arg.where.date.lte).toBeInstanceOf(Date);
    expect(arg.include.activities).toBeTruthy();
  });

  it("activities 쿼리가 없으면 기존 경량 인덱스(활동 미포함)", async () => {
    mockPrisma.day.findMany.mockResolvedValue([
      {
        id: 10,
        tripId: 1,
        date: new Date("2026-06-07"),
        title: null,
        content: null,
      },
    ]);
    const res = await GET(
      new Request("http://localhost/api/trips/1/days"),
      params,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].id).toBe(10);
    expect(body[0].activities).toBeUndefined();
    // include 없이 조회.
    const arg = mockPrisma.day.findMany.mock.calls[0][0];
    expect(arg.include).toBeUndefined();
  });

  it("비멤버는 403", async () => {
    mockAuthHelpers.getTripMember.mockResolvedValue(null);
    const res = await GET(
      new Request("http://localhost/api/trips/1/days?activities=1"),
      params,
    );
    expect(res.status).toBe(403);
  });
});
