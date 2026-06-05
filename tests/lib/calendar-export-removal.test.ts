import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * spec 056 (외부 캘린더 내보내기 제품 노출 제거) — 자동 반영 미발생 회귀 가드.
 *
 * 활동 생성·수정·삭제 라우트가 외부 캘린더 자동 반영(triggerCalendarAutoSync)을
 * 더 이상 호출하지 않음을 검증한다(SSOT 단방향, SC-001). auto-sync 모듈은 재도입
 * 여지를 위해 보존되므로 mock 가능하며, 라우트가 이를 호출하지 않아야 한다.
 */

const { mockPrisma, mockAuthHelpers, mockAutoSync } = vi.hoisted(() => ({
  mockPrisma: {
    activity: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    day: { findUnique: vi.fn() },
  },
  mockAuthHelpers: {
    getAuthUserId: vi.fn(),
    getTripMember: vi.fn(),
    canEdit: vi.fn(),
  },
  mockAutoSync: { triggerCalendarAutoSync: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth-helpers", () => mockAuthHelpers);
vi.mock("@/lib/calendar/auto-sync", () => mockAutoSync);
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  // after()가 만약 남아 있다면 즉시 실행해 호출 누락을 숨기지 않도록 한다.
  after: (fn: () => void) => fn(),
}));

import {
  DELETE,
  PUT,
} from "@/app/api/trips/[id]/days/[dayId]/activities/[activityId]/route";
import { POST } from "@/app/api/trips/[id]/days/[dayId]/activities/route";

function req(body: object, method = "POST"): Request {
  return new Request("http://localhost/api/trips/1/days/1/activities", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const createParams = { params: Promise.resolve({ id: "1", dayId: "1" }) };
const activityParams = {
  params: Promise.resolve({ id: "1", dayId: "1", activityId: "10" }),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthHelpers.getAuthUserId.mockResolvedValue("user1");
  mockAuthHelpers.canEdit.mockResolvedValue(true);
  mockPrisma.day.findUnique.mockResolvedValue({
    id: 1,
    tripId: 1,
    date: new Date("2026-06-10T00:00:00Z"),
  });
  mockPrisma.activity.create.mockResolvedValue({ id: 10, title: "t" });
  mockPrisma.activity.update.mockResolvedValue({ id: 10, title: "t2" });
  mockPrisma.activity.delete.mockResolvedValue({ id: 10 });
});

describe("spec 056 — 활동 변경 시 외부 캘린더 자동 반영 미발생", () => {
  it("활동 생성은 외부 캘린더 자동 반영을 호출하지 않는다", async () => {
    const res = await POST(
      req({ category: "SIGHTSEEING", title: "에펠탑" }),
      createParams,
    );
    expect(res.status).toBe(201);
    expect(mockAutoSync.triggerCalendarAutoSync).not.toHaveBeenCalled();
  });

  it("활동 수정은 외부 캘린더 자동 반영을 호출하지 않는다", async () => {
    const res = await PUT(req({ title: "수정" }, "PUT"), activityParams);
    expect(res.status).toBe(200);
    expect(mockAutoSync.triggerCalendarAutoSync).not.toHaveBeenCalled();
  });

  it("활동 삭제는 외부 캘린더 자동 반영을 호출하지 않는다", async () => {
    const res = await DELETE(req({}, "DELETE"), activityParams);
    expect(res.status).toBe(200);
    expect(mockAutoSync.triggerCalendarAutoSync).not.toHaveBeenCalled();
  });
});
