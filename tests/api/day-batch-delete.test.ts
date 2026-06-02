import { beforeEach, describe, expect, it, vi } from "vitest";

// #743 — 일자 다건 삭제(batch-delete) 라우트.
const { mockPrisma, mockAuthHelpers, mockAutoSync } = vi.hoisted(() => ({
  mockPrisma: {
    day: { findMany: vi.fn(), deleteMany: vi.fn() },
  },
  mockAuthHelpers: { getAuthUserId: vi.fn(), canEdit: vi.fn() },
  mockAutoSync: { triggerCalendarAutoSync: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth-helpers", () => mockAuthHelpers);
vi.mock("@/lib/calendar/auto-sync", () => mockAutoSync);
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (fn: () => void) => fn(),
}));

import { POST } from "@/app/api/trips/[id]/days/batch-delete/route";

const params = { params: Promise.resolve({ id: "5" }) };
function req(body: unknown) {
  return new Request("http://localhost/api/trips/5/days/batch-delete", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthHelpers.getAuthUserId.mockResolvedValue("user1");
  mockAuthHelpers.canEdit.mockResolvedValue(true);
  mockPrisma.day.deleteMany.mockResolvedValue({ count: 0 });
});

describe("POST /api/trips/{id}/days/batch-delete", () => {
  it("미인증이면 401", async () => {
    mockAuthHelpers.getAuthUserId.mockResolvedValue(null);
    const res = await POST(req({ ids: [1] }), params);
    expect(res.status).toBe(401);
  });

  it("편집 권한 없으면 403", async () => {
    mockAuthHelpers.canEdit.mockResolvedValue(false);
    const res = await POST(req({ ids: [1] }), params);
    expect(res.status).toBe(403);
  });

  it("빈 식별자 목록이면 400", async () => {
    const res = await POST(req({ ids: [] }), params);
    expect(res.status).toBe(400);
  });

  it("부분 성공 — 존재하는 일자만 삭제(활동 cascade)·자동 반영 1회", async () => {
    mockPrisma.day.findMany.mockResolvedValue([{ id: 76 }, { id: 77 }]);
    const res = await POST(req({ ids: [76, 77, 999] }), params);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.deleted.sort()).toEqual([76, 77]);
    expect(data.skipped).toEqual([999]);
    expect(mockPrisma.day.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [76, 77] }, tripId: 5 },
    });
    expect(mockAutoSync.triggerCalendarAutoSync).toHaveBeenCalledTimes(1);
  });

  it("모두 무효면 삭제 0건·자동 반영 미호출", async () => {
    mockPrisma.day.findMany.mockResolvedValue([]);
    const res = await POST(req({ ids: [999] }), params);
    const data = await res.json();
    expect(data.deleted).toEqual([]);
    expect(mockPrisma.day.deleteMany).not.toHaveBeenCalled();
    expect(mockAutoSync.triggerCalendarAutoSync).not.toHaveBeenCalled();
  });

  it("잘못된 trip id면 400", async () => {
    const res = await POST(req({ ids: [1] }), {
      params: Promise.resolve({ id: "abc" }),
    });
    expect(res.status).toBe(400);
  });

  it("잘못된 JSON 본문이면 400", async () => {
    const bad = new Request(
      "http://localhost/api/trips/5/days/batch-delete",
      { method: "POST", body: "not-json" },
    );
    const res = await POST(bad, params);
    expect(res.status).toBe(400);
  });
});
