import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockAuthHelpers } = vi.hoisted(() => ({
  mockPrisma: {
    day: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
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
  // 기본: insert 직후 derived 가 명목과 일치 (2026-06-01 기준)
  mockPrisma.day.aggregate.mockResolvedValue({
    _min: { date: new Date("2026-06-01T00:00:00Z") },
    _max: { date: new Date("2026-06-30T00:00:00Z") },
  });
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

  it("Trip 범위 밖 date → derived 가 새 day 까지 포함해 자동 확장 (v3.0.0)", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.create.mockResolvedValue({
      id: 60,
      tripId: 1,
      date: new Date("2026-07-05T00:00:00Z"),
    });
    // insert 직후 derived: 2026-06-01 ~ 2026-07-05 로 확장됨을 mock 으로 표현
    mockPrisma.day.aggregate.mockResolvedValue({
      _min: { date: new Date("2026-06-01T00:00:00Z") },
      _max: { date: new Date("2026-07-05T00:00:00Z") },
    });

    const res = await POST(makeRequest({ date: "2026-07-05" }), params());
    expect(res.status).toBe(201);
    // v3.0.0 contract — 명목 trip.update 호출이 더 이상 일어나지 않는다.
    // 기간은 응답 시점에 derived(min/max) 로 자동 계산.
    expect(mockPrisma.trip.update).not.toHaveBeenCalled();
  });

  it("returns 409 when date 중복 (P2002)", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.create.mockRejectedValue({ code: "P2002" });

    const res = await POST(makeRequest({ date: "2026-06-07" }), params());
    expect(res.status).toBe(409);
  });
});
