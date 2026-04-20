import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockAuthHelpers } = vi.hoisted(() => ({
  mockPrisma: {
    day: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    trip: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  mockAuthHelpers: {
    getAuthUserId: vi.fn(),
    getTripMember: vi.fn(),
    canEdit: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth-helpers", () => mockAuthHelpers);

import { POST } from "@/app/api/trips/[id]/days/route";

const mockAuth = mockAuthHelpers.getAuthUserId;
const mockCanEdit = mockAuthHelpers.canEdit;

const TRIP = {
  id: 1,
  startDate: new Date("2026-06-01T00:00:00Z"),
  endDate: new Date("2026-06-30T00:00:00Z"),
};

function makeRequest(body: object): Request {
  return new Request("http://localhost/api/trips/1/days", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function params() {
  return { params: Promise.resolve({ id: "1" }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(
    async (cb: (tx: typeof mockPrisma) => unknown) => cb(mockPrisma),
  );
  mockPrisma.day.findMany.mockResolvedValue([]);
  mockPrisma.trip.findUniqueOrThrow.mockResolvedValue(TRIP);
});

describe("POST /trips/{id}/days", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest({ date: "2026-06-07" }), params());
    expect(res.status).toBe(401);
  });

  it("returns 403 when cannot edit", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(false);
    const res = await POST(makeRequest({ date: "2026-06-07" }), params());
    expect(res.status).toBe(403);
  });

  it("returns 400 when date missing", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    const res = await POST(makeRequest({ title: "No date" }), params());
    expect(res.status).toBe(400);
  });

  it("creates day + 응답에 sortOrder 동적 부착 (date 파생)", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    const created = {
      id: 50,
      tripId: 1,
      date: new Date("2026-06-07T00:00:00Z"),
    };
    mockPrisma.day.create.mockResolvedValue(created);

    const res = await POST(makeRequest({ date: "2026-06-07" }), params());
    expect(res.status).toBe(201);
    const data = await res.json();
    // 2026-06-07 - 2026-06-01 + 1 = 7
    expect(data.sortOrder).toBe(7);
    // sortOrder 컬럼이 없으므로 create.data에 sortOrder 키 없음
    const createArgs = mockPrisma.day.create.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(createArgs.data.sortOrder).toBeUndefined();
  });

  it("Trip 범위 밖 date → expandTripRangeIfNeeded로 자동 확장", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.create.mockResolvedValue({
      id: 60,
      tripId: 1,
      date: new Date("2026-07-05T00:00:00Z"),
      sortOrder: 35,
    });
    mockPrisma.day.findUniqueOrThrow.mockResolvedValue({
      id: 60,
      tripId: 1,
      date: new Date("2026-07-05T00:00:00Z"),
      sortOrder: 35,
    });

    const res = await POST(makeRequest({ date: "2026-07-05" }), params());
    expect(res.status).toBe(201);
    // Trip endDate가 새 date를 포함하도록 확장됨
    expect(mockPrisma.trip.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        endDate: expect.any(Date),
      }),
    });
  });

  it("returns 409 when date 중복 (P2002)", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.create.mockRejectedValue({ code: "P2002" });

    const res = await POST(makeRequest({ date: "2026-06-07" }), params());
    expect(res.status).toBe(409);
  });
});
