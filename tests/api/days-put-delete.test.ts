import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockAuthHelpers } = vi.hoisted(() => ({
  mockPrisma: {
    day: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    trip: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    tripMember: { findUnique: vi.fn() },
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

import { PUT, DELETE } from "@/app/api/trips/[id]/days/[dayId]/route";

const mockAuth = mockAuthHelpers.getAuthUserId;
const mockCanEdit = mockAuthHelpers.canEdit;

const TRIP = {
  id: 1,
  startDate: new Date("2026-06-01T00:00:00Z"),
  endDate: new Date("2026-06-30T00:00:00Z"),
};

beforeEach(() => {
  mockPrisma.$transaction.mockImplementation(
    async (cb: (tx: typeof mockPrisma) => unknown) => cb(mockPrisma),
  );
  mockPrisma.day.findMany.mockResolvedValue([]);
  mockPrisma.trip.findUniqueOrThrow.mockResolvedValue(TRIP);
});

function makeRequest(body?: object, method = "PUT"): Request {
  return new Request("http://localhost/api/trips/1/days/43", {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body && { body: JSON.stringify(body) }),
  });
}

function params() {
  return { params: Promise.resolve({ id: "1", dayId: "43" }) };
}

describe("PUT /days/{dayId}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      async (cb: (tx: typeof mockPrisma) => unknown) => cb(mockPrisma),
    );
    mockPrisma.day.findMany.mockResolvedValue([]);
    mockPrisma.trip.findUniqueOrThrow.mockResolvedValue(TRIP);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PUT(makeRequest({ title: "Updated" }), params());
    expect(res.status).toBe(401);
  });

  it("returns 403 when cannot edit", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(false);
    const res = await PUT(makeRequest({ title: "Updated" }), params());
    expect(res.status).toBe(403);
  });

  it("updates day with partial fields (title only)", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    const updated = {
      id: 43,
      title: "Updated",
      content: null,
      date: new Date("2026-06-07T00:00:00Z"),
    };
    mockPrisma.day.update.mockResolvedValue(updated);
    mockPrisma.day.findUniqueOrThrow.mockResolvedValue(updated);

    const res = await PUT(makeRequest({ title: "Updated" }), params());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe("Updated");
    // 응답에 sortOrder 동적 부착됨
    expect(data.sortOrder).toBe(7);
    // date 미변경이어도 startDate 조회 위해 trip.findUniqueOrThrow 1회 호출
    expect(mockPrisma.trip.findUniqueOrThrow).toHaveBeenCalled();
  });

  it("date 변경 시 expandTripRangeIfNeeded 경유 (sortOrder 컬럼 쓰기 없음)", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    const updated = {
      id: 43,
      title: "Full",
      content: "md",
      date: new Date("2026-06-07T00:00:00Z"),
    };
    mockPrisma.day.update.mockResolvedValue(updated);
    mockPrisma.day.findUniqueOrThrow.mockResolvedValue(updated);

    const res = await PUT(
      makeRequest({ title: "Full", content: "md", date: "2026-06-07" }),
      params(),
    );
    expect(res.status).toBe(200);
    expect(mockPrisma.trip.findUniqueOrThrow).toHaveBeenCalled();
    // sortOrder 컬럼은 더 이상 쓰지 않음
    const updateCall = mockPrisma.day.update.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(updateCall.data.sortOrder).toBeUndefined();
    // 응답엔 동적 부착됨
    const data = await res.json();
    expect(data.sortOrder).toBe(7);
  });

  it("ignores sortOrder from client body", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.update.mockResolvedValue({ id: 43, title: "X" });
    mockPrisma.day.findUniqueOrThrow.mockResolvedValue({ id: 43, title: "X" });

    await PUT(makeRequest({ title: "X", sortOrder: 999 }), params());
    const updateCall = mockPrisma.day.update.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(updateCall.data.sortOrder).toBeUndefined();
  });

  it("returns 409 when date 충돌 (P2002)", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.update.mockRejectedValue({ code: "P2002" });

    const res = await PUT(
      makeRequest({ date: "2026-06-07" }),
      params(),
    );
    expect(res.status).toBe(409);
  });

  it("rethrows non-P2002 errors", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.update.mockRejectedValue(new Error("DB exploded"));

    await expect(
      PUT(makeRequest({ title: "X" }), params()),
    ).rejects.toThrow("DB exploded");
  });
});

describe("DELETE /days/{dayId}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      async (cb: (tx: typeof mockPrisma) => unknown) => cb(mockPrisma),
    );
    mockPrisma.day.findMany.mockResolvedValue([]);
    mockPrisma.trip.findUniqueOrThrow.mockResolvedValue(TRIP);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(makeRequest(undefined, "DELETE"), params());
    expect(res.status).toBe(401);
  });

  it("returns 403 when cannot edit", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(false);
    const res = await DELETE(makeRequest(undefined, "DELETE"), params());
    expect(res.status).toBe(403);
  });

  it("deletes day (sortOrder 컬럼 없으므로 재계산 불필요)", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.delete.mockResolvedValue({});

    const res = await DELETE(makeRequest(undefined, "DELETE"), params());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    // 컬럼 사라져 재계산 호출 없음
    expect(mockPrisma.trip.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});
