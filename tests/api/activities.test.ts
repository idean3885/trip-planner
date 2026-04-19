import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockAuthHelpers } = vi.hoisted(() => ({
  mockPrisma: {
    activity: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    day: { findUnique: vi.fn() },
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

import { GET, POST, PATCH } from "@/app/api/trips/[id]/days/[dayId]/activities/route";
import { PUT, DELETE } from "@/app/api/trips/[id]/days/[dayId]/activities/[activityId]/route";
const mockAuth = mockAuthHelpers.getAuthUserId;
const mockMember = mockAuthHelpers.getTripMember;
const mockCanEdit = mockAuthHelpers.canEdit;

function makeRequest(body?: object, method = "GET"): Request {
  return new Request("http://localhost/api/trips/1/days/1/activities", {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body && { body: JSON.stringify(body) }),
  });
}

function params(overrides = {}) {
  return { params: Promise.resolve({ id: "1", dayId: "1", ...overrides }) };
}

function activityParams(overrides = {}) {
  return { params: Promise.resolve({ id: "1", dayId: "1", activityId: "10", ...overrides }) };
}

describe("GET /activities", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeRequest(), params());
    expect(res.status).toBe(401);
  });

  it("returns 403 when not a member", async () => {
    mockAuth.mockResolvedValue("user1");
    mockMember.mockResolvedValue(null);
    const res = await GET(makeRequest(), params());
    expect(res.status).toBe(403);
  });

  it("returns activities list", async () => {
    mockAuth.mockResolvedValue("user1");
    mockMember.mockResolvedValue({ role: "HOST" });
    const activities = [{ id: 1, title: "Test", category: "SIGHTSEEING" }];
    mockPrisma.activity.findMany.mockResolvedValue(activities);

    const res = await GET(makeRequest(), params());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(activities);
  });
});

describe("POST /activities", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest({ category: "DINING", title: "Test" }, "POST"), params());
    expect(res.status).toBe(401);
  });

  it("returns 403 when cannot edit", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(false);
    const res = await POST(makeRequest({ category: "DINING", title: "Test" }, "POST"), params());
    expect(res.status).toBe(403);
  });

  it("returns 404 when day not found", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.findUnique.mockResolvedValue(null);
    const res = await POST(makeRequest({ category: "DINING", title: "Test" }, "POST"), params());
    expect(res.status).toBe(404);
  });

  it("returns 400 when missing required fields", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.findUnique.mockResolvedValue({ id: 1 });
    const res = await POST(makeRequest({ title: "No category" }, "POST"), params());
    expect(res.status).toBe(400);
  });

  it("creates activity with all fields", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.findUnique.mockResolvedValue({ id: 1, date: new Date("2026-06-07T00:00:00Z") });
    const created = { id: 10, category: "DINING", title: "Lunch", startTime: "2026-06-07T12:00:00.000Z" };
    mockPrisma.activity.create.mockResolvedValue(created);

    const res = await POST(
      makeRequest({
        category: "DINING",
        title: "Lunch",
        startTime: "12:00",
        endTime: "13:00",
        location: "Restaurant",
        memo: "Good food",
        cost: 25,
        currency: "EUR",
        reservationStatus: "RECOMMENDED",
      }, "POST"),
      params()
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBe(10);
  });

  it("creates activity without startTime/endTime (conditional spread false branch)", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.findUnique.mockResolvedValue({ id: 1, date: new Date("2026-06-07T00:00:00Z") });
    mockPrisma.activity.create.mockResolvedValue({ id: 12, category: "OTHER", title: "Walk" });

    const res = await POST(
      makeRequest({ category: "OTHER", title: "Walk" }, "POST"),
      params()
    );
    expect(res.status).toBe(201);
    const createArgs = mockPrisma.activity.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(createArgs.data.startTime).toBeUndefined();
    expect(createArgs.data.endTime).toBeUndefined();
    expect(createArgs.data.startTimezone).toBeUndefined();
    expect(createArgs.data.endTimezone).toBeUndefined();
  });

  it("POST explicit startTime=null persists null (toTimestamp ?? null right branch)", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.findUnique.mockResolvedValue({ id: 1, date: new Date("2026-06-07T00:00:00Z") });
    mockPrisma.activity.create.mockResolvedValue({ id: 20, category: "OTHER", title: "X" });

    await POST(
      makeRequest({ category: "OTHER", title: "X", startTime: null, endTime: null }, "POST"),
      params(),
    );
    const args = mockPrisma.activity.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(args.data.startTime).toBeNull();
    expect(args.data.endTime).toBeNull();
  });

  it("POST uses explicit endTimezone (not startTimezone fallback)", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.findUnique.mockResolvedValue({ id: 1, date: new Date("2026-06-07T00:00:00Z") });
    mockPrisma.activity.create.mockResolvedValue({ id: 21, category: "DINING", title: "Cross-tz" });

    await POST(
      makeRequest({
        category: "DINING", title: "Cross-tz",
        startTime: "10:00", startTimezone: "Europe/Lisbon",
        endTime: "22:00", endTimezone: "Asia/Seoul",
      }, "POST"),
      params(),
    );
    const args = mockPrisma.activity.create.mock.calls[0]?.[0] as {
      data: { endTimezone: string; endTime: Date };
    };
    expect(args.data.endTimezone).toBe("Asia/Seoul");
    // Seoul 22:00 = 13:00 UTC
    expect(args.data.endTime.toISOString()).toBe("2026-06-07T13:00:00.000Z");
  });

  it("POST converts HH:mm using IANA timezone (#232)", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.findUnique.mockResolvedValue({ id: 1, date: new Date("2026-06-07T00:00:00Z") });
    mockPrisma.activity.create.mockResolvedValue({ id: 11, category: "DINING", title: "Dinner" });

    await POST(
      makeRequest({
        category: "DINING",
        title: "Dinner",
        startTime: "20:15",
        startTimezone: "Europe/Lisbon",
        endTime: "21:30",
      }, "POST"),
      params()
    );

    const createArgs = mockPrisma.activity.create.mock.calls[0]?.[0] as { data: { startTime: Date; endTime: Date } };
    expect(createArgs.data.startTime).toBeInstanceOf(Date);
    // Lisbon 여름(UTC+1): 20:15 = 19:15 UTC, 21:30 = 20:30 UTC (endTimezone 미지정 시 startTimezone 사용)
    expect(createArgs.data.startTime.toISOString()).toBe("2026-06-07T19:15:00.000Z");
    expect(createArgs.data.endTime.toISOString()).toBe("2026-06-07T20:30:00.000Z");
  });
});

describe("PATCH /activities (reorder)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCH(makeRequest({ orderedIds: [1] }, "PATCH"), params());
    expect(res.status).toBe(401);
  });

  it("returns 403 when cannot edit", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(false);
    const res = await PATCH(makeRequest({ orderedIds: [1] }, "PATCH"), params());
    expect(res.status).toBe(403);
  });

  it("returns 400 when orderedIds missing", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    const res = await PATCH(makeRequest({}, "PATCH"), params());
    expect(res.status).toBe(400);
  });

  it("returns 400 when orderedIds empty", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    const res = await PATCH(makeRequest({ orderedIds: [] }, "PATCH"), params());
    expect(res.status).toBe(400);
  });

  it("reorders activities", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.$transaction.mockResolvedValue([]);

    const res = await PATCH(makeRequest({ orderedIds: [3, 1, 2] }, "PATCH"), params());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});

describe("PUT /activities/{id}", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PUT(makeRequest({ title: "Updated" }, "PUT"), activityParams());
    expect(res.status).toBe(401);
  });

  it("returns 403 when cannot edit", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(false);
    const res = await PUT(makeRequest({ title: "Updated" }, "PUT"), activityParams());
    expect(res.status).toBe(403);
  });

  it("returns 404 when day not found", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.findUnique.mockResolvedValue(null);
    const res = await PUT(makeRequest({ title: "Updated" }, "PUT"), activityParams());
    expect(res.status).toBe(404);
  });

  it("updates activity with all fields", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.findUnique.mockResolvedValue({ id: 1, date: new Date("2026-06-07T00:00:00Z") });
    mockPrisma.activity.findUnique.mockResolvedValue({ startTimezone: null, endTimezone: null });
    const updated = { id: 10, title: "Updated", category: "DINING" };
    mockPrisma.activity.update.mockResolvedValue(updated);

    const res = await PUT(
      makeRequest({
        category: "DINING", title: "Updated", startTime: "12:00", endTime: "13:00",
        location: "Place", memo: "Note", cost: 10, currency: "USD",
        reservationStatus: "REQUIRED", sortOrder: 1,
      }, "PUT"),
      activityParams()
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe("Updated");
  });

  it("PUT with startTimezone uses IANA tz for HH:mm → UTC", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.findUnique.mockResolvedValue({ id: 1, date: new Date("2026-06-07T00:00:00Z") });
    mockPrisma.activity.update.mockResolvedValue({ id: 10, title: "X", category: "DINING" });

    await PUT(
      makeRequest({ startTime: "13:00", startTimezone: "Asia/Seoul" }, "PUT"),
      activityParams()
    );

    // findUnique는 호출되지 않아야 한다 (startTimezone이 요청에 있으므로)
    expect(mockPrisma.activity.findUnique).not.toHaveBeenCalled();
    // update의 startTime은 Seoul 13:00 = 04:00Z
    const updateArgs = mockPrisma.activity.update.mock.calls[0]?.[0] as { data: { startTime: Date } };
    expect(updateArgs.data.startTime).toBeInstanceOf(Date);
    expect(updateArgs.data.startTime.toISOString()).toBe("2026-06-07T04:00:00.000Z");
  });

  it("PUT endTime HH:mm w/o tz, stored endTimezone null → effStartTz fallback", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.findUnique.mockResolvedValue({ id: 1, date: new Date("2026-06-07T00:00:00Z") });
    // stored: endTimezone null — effEndTz는 effStartTz(Asia/Seoul)로 귀결
    mockPrisma.activity.findUnique.mockResolvedValue({
      startTimezone: "Asia/Seoul",
      endTimezone: null,
    });
    mockPrisma.activity.update.mockResolvedValue({ id: 10, title: "X", category: "DINING" });

    await PUT(
      makeRequest({ endTime: "22:00" }, "PUT"),
      activityParams(),
    );
    const updateArgs = mockPrisma.activity.update.mock.calls[0]?.[0] as {
      data: { endTime: Date };
    };
    // Seoul 22:00 = 13:00 UTC
    expect(updateArgs.data.endTime.toISOString()).toBe("2026-06-07T13:00:00.000Z");
  });

  it("PUT with ISO startTime (T 포함) does not trigger existing-tz lookup", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.findUnique.mockResolvedValue({ id: 1, date: new Date("2026-06-07T00:00:00Z") });
    mockPrisma.activity.update.mockResolvedValue({ id: 10, title: "X", category: "DINING" });

    await PUT(
      makeRequest({ startTime: "2026-06-07T12:00:00.000Z" }, "PUT"),
      activityParams(),
    );
    // ISO 값은 typeof string + includes('T') 검사에서 걸러져 needsExistingTz=false
    expect(mockPrisma.activity.findUnique).not.toHaveBeenCalled();
  });

  it("PUT with only startTime (no tz in body) falls back to stored timezone", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.day.findUnique.mockResolvedValue({ id: 1, date: new Date("2026-06-07T00:00:00Z") });
    mockPrisma.activity.findUnique.mockResolvedValue({ startTimezone: "Europe/Lisbon", endTimezone: "Europe/Lisbon" });
    mockPrisma.activity.update.mockResolvedValue({ id: 10, title: "X", category: "DINING" });

    await PUT(
      makeRequest({ startTime: "20:15" }, "PUT"),
      activityParams()
    );

    expect(mockPrisma.activity.findUnique).toHaveBeenCalled();
    const updateArgs = mockPrisma.activity.update.mock.calls[0]?.[0] as { data: { startTime: Date } };
    // Lisbon 여름(WEST, UTC+1) 20:15 = 19:15 UTC
    expect(updateArgs.data.startTime.toISOString()).toBe("2026-06-07T19:15:00.000Z");
  });
});

describe("DELETE /activities/{id}", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(makeRequest(undefined, "DELETE"), activityParams());
    expect(res.status).toBe(401);
  });

  it("returns 403 when cannot edit", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(false);
    const res = await DELETE(makeRequest(undefined, "DELETE"), activityParams());
    expect(res.status).toBe(403);
  });

  it("deletes activity", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
    mockPrisma.activity.delete.mockResolvedValue({});

    const res = await DELETE(makeRequest(undefined, "DELETE"), activityParams());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
