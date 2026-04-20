import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockAuthHelpers } = vi.hoisted(() => ({
  mockPrisma: {
    trip: { create: vi.fn(), delete: vi.fn() },
    tripMember: { delete: vi.fn() },
  },
  mockAuthHelpers: {
    getAuthUserId: vi.fn(),
    getTripMember: vi.fn(),
    isOwner: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth-helpers", () => mockAuthHelpers);

import { POST } from "@/app/api/trips/route";
import { DELETE } from "@/app/api/trips/[id]/route";
import { POST as LEAVE } from "@/app/api/trips/[id]/leave/route";

const mockAuth = mockAuthHelpers.getAuthUserId;
const mockIsOwner = mockAuthHelpers.isOwner;
const mockGetMember = mockAuthHelpers.getTripMember;

function tripParams(id = "1") {
  return { params: Promise.resolve({ id }) };
}

function jsonRequest(url: string, body: unknown, method = "POST") {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/trips — 생성 (#191)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(jsonRequest("http://localhost/api/trips", { title: "x" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when title missing", async () => {
    mockAuth.mockResolvedValue("user1");
    const res = await POST(jsonRequest("http://localhost/api/trips", {}));
    expect(res.status).toBe(400);
  });

  it("creates trip with creator as OWNER (regression: was HOST, caused delete 403)", async () => {
    mockAuth.mockResolvedValue("user1");
    mockPrisma.trip.create.mockResolvedValue({ id: 42, title: "Test" });

    const res = await POST(
      jsonRequest("http://localhost/api/trips", {
        title: "Test",
        startDate: "2026-06-01",
        endDate: "2026-06-10",
      }),
    );

    expect(res.status).toBe(201);
    const callArg = mockPrisma.trip.create.mock.calls[0][0];
    expect(callArg.data.tripMembers.create).toEqual({ userId: "user1", role: "OWNER" });
    expect(callArg.data.createdBy).toBe("user1");
  });

  it("returns 400 when startDate or endDate missing (v2.7.0 NOT NULL)", async () => {
    mockAuth.mockResolvedValue("user1");
    const res = await POST(
      jsonRequest("http://localhost/api/trips", { title: "x" }),
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/trips/{id} — 삭제 (#191)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(new Request("http://localhost/api/trips/1", { method: "DELETE" }), tripParams());
    expect(res.status).toBe(401);
  });

  it("returns 403 when not OWNER", async () => {
    mockAuth.mockResolvedValue("user1");
    mockIsOwner.mockResolvedValue(false);
    const res = await DELETE(new Request("http://localhost/api/trips/1", { method: "DELETE" }), tripParams());
    expect(res.status).toBe(403);
  });

  it("deletes trip when OWNER", async () => {
    mockAuth.mockResolvedValue("user1");
    mockIsOwner.mockResolvedValue(true);
    mockPrisma.trip.delete.mockResolvedValue({ id: 1 });

    const res = await DELETE(new Request("http://localhost/api/trips/1", { method: "DELETE" }), tripParams());

    expect(res.status).toBe(200);
    expect(mockPrisma.trip.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});

describe("POST /api/trips/{id}/leave — 나가기 (#191)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await LEAVE(new Request("http://localhost/api/trips/1/leave", { method: "POST" }), tripParams());
    expect(res.status).toBe(401);
  });

  it("returns 400 when not a member", async () => {
    mockAuth.mockResolvedValue("user1");
    mockGetMember.mockResolvedValue(null);
    const res = await LEAVE(new Request("http://localhost/api/trips/1/leave", { method: "POST" }), tripParams());
    expect(res.status).toBe(400);
  });

  it("blocks OWNER — must transfer first", async () => {
    mockAuth.mockResolvedValue("user1");
    mockGetMember.mockResolvedValue({ id: 10, role: "OWNER" });
    const res = await LEAVE(new Request("http://localhost/api/trips/1/leave", { method: "POST" }), tripParams());
    expect(res.status).toBe(400);
    mockPrisma.tripMember.delete.mockClear();
    expect(mockPrisma.tripMember.delete).not.toHaveBeenCalled();
  });

  it("lets HOST leave", async () => {
    mockAuth.mockResolvedValue("user1");
    mockGetMember.mockResolvedValue({ id: 10, role: "HOST" });
    mockPrisma.tripMember.delete.mockResolvedValue({ id: 10 });
    const res = await LEAVE(new Request("http://localhost/api/trips/1/leave", { method: "POST" }), tripParams());
    expect(res.status).toBe(200);
    expect(mockPrisma.tripMember.delete).toHaveBeenCalledWith({ where: { id: 10 } });
  });

  it("lets GUEST leave", async () => {
    mockAuth.mockResolvedValue("user1");
    mockGetMember.mockResolvedValue({ id: 11, role: "GUEST" });
    mockPrisma.tripMember.delete.mockResolvedValue({ id: 11 });
    const res = await LEAVE(new Request("http://localhost/api/trips/1/leave", { method: "POST" }), tripParams());
    expect(res.status).toBe(200);
  });
});
