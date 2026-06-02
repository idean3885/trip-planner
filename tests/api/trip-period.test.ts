/**
 * spec 043 US1 — 여행 기간 직접 편집 (PUT /api/trips/[id]/period).
 *
 * 기간 확장(경계 Day 생성) · 축소 시 활동 보유 일자 confirm 게이트(409) ·
 * confirm 적용 · 손실 없을 때 즉시 적용 · 시작>종료 거부를 검증한다.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, mockAuthHelpers } = vi.hoisted(() => ({
  mockPrisma: {
    day: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  mockAuthHelpers: {
    getAuthUserId: vi.fn(),
    canEdit: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth-helpers", () => mockAuthHelpers);

import { PUT } from "@/app/api/trips/[id]/period/route";

function req(body: object): Request {
  return new Request("http://localhost/api/trips/1/period", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const params = { params: Promise.resolve({ id: "1" }) };
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthHelpers.getAuthUserId.mockResolvedValue("u1");
  mockAuthHelpers.canEdit.mockResolvedValue(true);
  mockPrisma.$transaction.mockImplementation(
    async (cb: (tx: typeof mockPrisma) => unknown) => cb(mockPrisma),
  );
  mockPrisma.day.create.mockResolvedValue({});
});

describe("PUT /api/trips/[id]/period", () => {
  it("기간 확장 시 경계 Day 를 생성하고 200", async () => {
    mockPrisma.day.findMany.mockResolvedValue([
      { id: 1, date: d("2026-06-07"), title: null, _count: { activities: 0 } },
    ]);
    mockPrisma.day.aggregate.mockResolvedValue({
      _min: { date: d("2026-06-06") },
      _max: { date: d("2026-06-10") },
    });
    const res = await PUT(
      req({ startDate: "2026-06-06", endDate: "2026-06-10" }),
      params,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    // 6/6·6/10 두 경계 Day 생성, 범위 밖 삭제는 없음.
    expect(mockPrisma.day.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.day.deleteMany).not.toHaveBeenCalled();
  });

  it("축소로 활동 보유 일자가 삭제될 때 confirm 없으면 409", async () => {
    mockPrisma.day.findMany.mockResolvedValue([
      { id: 1, date: d("2026-06-06"), title: "도착", _count: { activities: 2 } },
      { id: 2, date: d("2026-06-10"), title: null, _count: { activities: 0 } },
    ]);
    const res = await PUT(
      req({ startDate: "2026-06-08", endDate: "2026-06-10" }),
      params,
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.status).toBe("confirm_required");
    expect(body.totalActivities).toBe(2);
    expect(body.dayCount).toBe(1);
    expect(mockPrisma.day.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.day.create).not.toHaveBeenCalled();
  });

  it("confirm:true 면 활동 보유 일자도 삭제하고 200", async () => {
    mockPrisma.day.findMany.mockResolvedValue([
      { id: 1, date: d("2026-06-06"), title: "도착", _count: { activities: 2 } },
      { id: 2, date: d("2026-06-10"), title: null, _count: { activities: 0 } },
    ]);
    mockPrisma.day.aggregate.mockResolvedValue({
      _min: { date: d("2026-06-08") },
      _max: { date: d("2026-06-10") },
    });
    const res = await PUT(
      req({ startDate: "2026-06-08", endDate: "2026-06-10", confirm: true }),
      params,
    );
    expect(res.status).toBe(200);
    expect(mockPrisma.day.deleteMany).toHaveBeenCalled();
    // 6/8 경계 Day 만 생성(6/10 은 이미 존재).
    expect(mockPrisma.day.create).toHaveBeenCalledTimes(1);
  });

  it("삭제될 활동이 없으면 confirm 없이 축소 적용", async () => {
    mockPrisma.day.findMany.mockResolvedValue([
      { id: 1, date: d("2026-06-06"), title: null, _count: { activities: 0 } },
      { id: 2, date: d("2026-06-10"), title: null, _count: { activities: 0 } },
    ]);
    mockPrisma.day.aggregate.mockResolvedValue({
      _min: { date: d("2026-06-08") },
      _max: { date: d("2026-06-10") },
    });
    const res = await PUT(
      req({ startDate: "2026-06-08", endDate: "2026-06-10" }),
      params,
    );
    expect(res.status).toBe(200);
    expect(mockPrisma.day.deleteMany).toHaveBeenCalled();
  });

  it("시작일이 종료일보다 늦으면 400 (트랜잭션 미진입)", async () => {
    const res = await PUT(
      req({ startDate: "2026-06-10", endDate: "2026-06-08" }),
      params,
    );
    expect(res.status).toBe(400);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("편집 권한이 없으면 403", async () => {
    mockAuthHelpers.canEdit.mockResolvedValue(false);
    const res = await PUT(
      req({ startDate: "2026-06-06", endDate: "2026-06-10" }),
      params,
    );
    expect(res.status).toBe(403);
  });
});
