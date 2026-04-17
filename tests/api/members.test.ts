import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockAuthHelpers } = vi.hoisted(() => ({
  mockPrisma: {
    tripMember: { findMany: vi.fn() },
  },
  mockAuthHelpers: {
    getAuthUserId: vi.fn(),
    getTripMember: vi.fn(),
    isHost: vi.fn(),
    isOwner: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth-helpers", () => mockAuthHelpers);

import { GET } from "@/app/api/trips/[id]/members/route";

const mockAuth = mockAuthHelpers.getAuthUserId;
const mockGetMember = mockAuthHelpers.getTripMember;

function tripParams(id = "1") {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/trips/{id}/members — 멤버 목록 (#193)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/trips/1/members"), tripParams());
    expect(res.status).toBe(401);
  });

  it("returns 403 when requester is not a member", async () => {
    mockAuth.mockResolvedValue("user1");
    mockGetMember.mockResolvedValue(null);
    mockPrisma.tripMember.findMany.mockResolvedValue([]);
    const res = await GET(new Request("http://localhost/api/trips/1/members"), tripParams());
    expect(res.status).toBe(403);
  });

  it("returns members with myRole when member", async () => {
    mockAuth.mockResolvedValue("user1");
    mockGetMember.mockResolvedValue({ id: 1, userId: "user1", role: "OWNER" });
    mockPrisma.tripMember.findMany.mockResolvedValue([
      { id: 1, userId: "user1", role: "OWNER", user: { id: "user1", name: "A" } },
      { id: 2, userId: "user2", role: "HOST", user: { id: "user2", name: "B" } },
      { id: 3, userId: "user3", role: "GUEST", user: { id: "user3", name: "C" } },
    ]);

    const res = await GET(new Request("http://localhost/api/trips/1/members"), tripParams());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.myRole).toBe("OWNER");
    expect(body.members).toHaveLength(3);
    expect(body.members.map((m: { role: string }) => m.role)).toEqual(["OWNER", "HOST", "GUEST"]);
  });
});
