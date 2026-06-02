import { beforeEach, describe, expect, it, vi } from "vitest";

// #743 — 활동 다건 삭제(batch-delete) 라우트.
const { mockPrisma, mockAuthHelpers, mockAutoSync } = vi.hoisted(() => ({
  mockPrisma: {
    activity: { findMany: vi.fn(), deleteMany: vi.fn() },
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

import { POST } from "@/app/api/trips/[id]/activities/batch-delete/route";

const params = { params: Promise.resolve({ id: "5" }) };
function req(body: unknown) {
  return new Request("http://localhost/api/trips/5/activities/batch-delete", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthHelpers.getAuthUserId.mockResolvedValue("user1");
  mockAuthHelpers.canEdit.mockResolvedValue(true);
  mockPrisma.activity.deleteMany.mockResolvedValue({ count: 0 });
});

describe("POST /api/trips/{id}/activities/batch-delete", () => {
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

  it("부분 성공 — 존재하는 식별자만 삭제하고 나머지는 skipped, 자동 반영 1회", async () => {
    mockPrisma.activity.findMany.mockResolvedValue([{ id: 160 }, { id: 161 }]);
    const res = await POST(req({ ids: [160, 161, 162] }), params);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.deleted.sort()).toEqual([160, 161]);
    expect(data.skipped).toEqual([162]);
    expect(mockPrisma.activity.deleteMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.activity.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [160, 161] }, day: { tripId: 5 } },
    });
    expect(mockAutoSync.triggerCalendarAutoSync).toHaveBeenCalledTimes(1);
  });

  it("모두 무효(타 여행·없음)면 삭제 0건·자동 반영 미호출", async () => {
    mockPrisma.activity.findMany.mockResolvedValue([]);
    const res = await POST(req({ ids: [999] }), params);
    const data = await res.json();
    expect(data.deleted).toEqual([]);
    expect(data.skipped).toEqual([999]);
    expect(mockPrisma.activity.deleteMany).not.toHaveBeenCalled();
    expect(mockAutoSync.triggerCalendarAutoSync).not.toHaveBeenCalled();
  });

  it("중복 식별자는 1회만 처리", async () => {
    mockPrisma.activity.findMany.mockResolvedValue([{ id: 160 }]);
    const res = await POST(req({ ids: [160, 160] }), params);
    const data = await res.json();
    expect(data.deleted).toEqual([160]);
  });
});
