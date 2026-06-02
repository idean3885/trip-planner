import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, mockAuthHelpers } = vi.hoisted(() => ({
  mockPrisma: {
    day: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
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

import { DELETE, PUT } from "@/app/api/trips/[id]/days/[dayId]/route";

const mockAuth = mockAuthHelpers.getAuthUserId;
const mockCanEdit = mockAuthHelpers.canEdit;

beforeEach(() => {
  mockPrisma.$transaction.mockImplementation(
    async (cb: (tx: typeof mockPrisma) => unknown) => cb(mockPrisma),
  );
  mockPrisma.day.findMany.mockResolvedValue([]);
  mockPrisma.day.aggregate.mockResolvedValue({
    _min: { date: new Date("2026-06-01T00:00:00Z") },
    _max: { date: new Date("2026-06-30T00:00:00Z") },
  });
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
    mockPrisma.day.aggregate.mockResolvedValue({
      _min: { date: new Date("2026-06-01T00:00:00Z") },
      _max: { date: new Date("2026-06-30T00:00:00Z") },
    });
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
    // v3.0.0 contract — trip.findUniqueOrThrow 가 더 이상 호출되지 않음.
    // derived 기간은 day.aggregate 로 직접 산출.
    expect(mockPrisma.trip.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(mockPrisma.day.aggregate).toHaveBeenCalled();
  });

  it("date 변경 시 derived 가 새 date 까지 포함해 갱신 (sortOrder 컬럼 쓰기 없음, v3.0.0)", async () => {
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
    // v3.0.0 contract — trip 명목 update 호출 없음
    expect(mockPrisma.trip.update).not.toHaveBeenCalled();
    expect(mockPrisma.day.aggregate).toHaveBeenCalled();
    const updateCall = mockPrisma.day.update.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(updateCall.data.sortOrder).toBeUndefined();
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

    const res = await PUT(makeRequest({ date: "2026-06-07" }), params());
    expect(res.status).toBe(409);
  });

  it("rethrows non-P2002 errors", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.update.mockRejectedValue(new Error("DB exploded"));

    await expect(PUT(makeRequest({ title: "X" }), params())).rejects.toThrow(
      "DB exploded",
    );
  });
});

describe("DELETE /days/{dayId}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      async (cb: (tx: typeof mockPrisma) => unknown) => cb(mockPrisma),
    );
    mockPrisma.day.findMany.mockResolvedValue([]);
    mockPrisma.day.aggregate.mockResolvedValue({
      _min: { date: new Date("2026-06-01T00:00:00Z") },
      _max: { date: new Date("2026-06-30T00:00:00Z") },
    });
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
