import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockAuthHelpers } = vi.hoisted(() => ({
  mockPrisma: {
    day: {
      create: vi.fn(),
      findMany: vi.fn(),
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

  it("creates day with auto-assigned sortOrder (ignores client value)", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    const created = { id: 50, tripId: 1, date: "2026-06-07", sortOrder: 0 };
    mockPrisma.day.create.mockResolvedValue(created);
    mockPrisma.day.findMany.mockResolvedValue([{ id: 50 }]);
    mockPrisma.day.findUniqueOrThrow.mockResolvedValue({ ...created, sortOrder: 1 });

    const res = await POST(
      makeRequest({ date: "2026-06-07", sortOrder: 999 }),
      params(),
    );

    expect(res.status).toBe(201);
    // create 호출 시 sortOrder = 0 (임시, 이후 resort로 덮어씀)
    const createArgs = mockPrisma.day.create.mock.calls[0]?.[0] as {
      data: { sortOrder: number };
    };
    expect(createArgs.data.sortOrder).toBe(0);
    // 클라이언트 sortOrder=999는 무시
    expect(createArgs.data.sortOrder).not.toBe(999);
    // resort가 호출되어 최종 sortOrder는 1 (유일 Day이므로)
    expect(mockPrisma.day.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ date: "asc" }, { id: "asc" }] }),
    );
  });

  it("middle-insert renumbers all days", async () => {
    // 기존 Day 2개(2026-06-05, 2026-06-09) 사이에 2026-06-07 추가
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.create.mockResolvedValue({
      id: 52, tripId: 1, date: "2026-06-07", sortOrder: 0,
    });
    // resort 단계에서 날짜순으로 3개 반환
    mockPrisma.day.findMany.mockResolvedValue([
      { id: 40 }, // 06-05
      { id: 52 }, // 06-07 (신규)
      { id: 41 }, // 06-09
    ]);
    mockPrisma.day.findUniqueOrThrow.mockResolvedValue({
      id: 52, tripId: 1, date: "2026-06-07", sortOrder: 2,
    });

    const res = await POST(makeRequest({ date: "2026-06-07" }), params());
    expect(res.status).toBe(201);

    // Day 3개 모두 update로 재번호
    expect(mockPrisma.day.update).toHaveBeenCalledTimes(3);
    expect(mockPrisma.day.update).toHaveBeenCalledWith({
      where: { id: 40 }, data: { sortOrder: 1 },
    });
    expect(mockPrisma.day.update).toHaveBeenCalledWith({
      where: { id: 52 }, data: { sortOrder: 2 },
    });
    expect(mockPrisma.day.update).toHaveBeenCalledWith({
      where: { id: 41 }, data: { sortOrder: 3 },
    });
  });
});
