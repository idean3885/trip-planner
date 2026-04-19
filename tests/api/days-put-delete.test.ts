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
    tripMember: { findUnique: vi.fn() },
    // resortDaysByDate는 $transaction 경유라 callback(tx) 스타일로 흉내
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

beforeEach(() => {
  // callback 기반 $transaction mock — tx === mockPrisma로 통과
  mockPrisma.$transaction.mockImplementation(
    async (cb: (tx: typeof mockPrisma) => unknown) => cb(mockPrisma),
  );
  mockPrisma.day.findMany.mockResolvedValue([]);
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
  beforeEach(() => vi.clearAllMocks());

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

  it("updates day with partial fields", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    const updated = { id: 43, title: "Updated", content: null };
    mockPrisma.day.update.mockResolvedValue(updated);

    const res = await PUT(makeRequest({ title: "Updated" }), params());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe("Updated");
  });

  it("updates day with all fields — date 변경 시 resort 트리거", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    const updated = { id: 43, title: "Full", content: "md", date: "2026-06-07", sortOrder: 2 };
    mockPrisma.day.update.mockResolvedValue(updated);
    mockPrisma.day.findMany.mockResolvedValue([
      { id: 41 }, { id: 42 }, { id: 43 },
    ]);
    mockPrisma.day.findUniqueOrThrow.mockResolvedValue({ ...updated, sortOrder: 3 });

    const res = await PUT(
      makeRequest({ title: "Full", content: "md", date: "2026-06-07" }),
      params()
    );
    expect(res.status).toBe(200);
    // resortDaysByDate가 각 Day에 대해 update를 호출해야 함
    expect(mockPrisma.day.findMany).toHaveBeenCalled();
  });

  it("ignores sortOrder from client body (서버 자동 채번)", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.update.mockResolvedValue({ id: 43, title: "X" });

    await PUT(
      makeRequest({ title: "X", sortOrder: 999 }),
      params()
    );
    const updateCall = mockPrisma.day.update.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(updateCall.data.sortOrder).toBeUndefined();
  });
});

describe("DELETE /days/{dayId}", () => {
  beforeEach(() => vi.clearAllMocks());

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

  it("deletes day", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.delete.mockResolvedValue({});

    const res = await DELETE(makeRequest(undefined, "DELETE"), params());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
