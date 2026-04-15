import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockAuthHelpers } = vi.hoisted(() => ({
  mockPrisma: {
    activity: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
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
    mockPrisma.day.findUnique.mockResolvedValue({ id: 1 });
    const created = { id: 10, category: "DINING", title: "Lunch", startTime: "12:00" };
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

  it("updates activity with all fields", async () => {
    mockAuth.mockResolvedValue("user1");
    mockCanEdit.mockResolvedValue(true);
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
