import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAuthHelpers, mockInviteToken } = vi.hoisted(() => ({
  mockAuthHelpers: {
    getAuthUserId: vi.fn(),
    isHost: vi.fn(),
  },
  mockInviteToken: {
    createInviteToken: vi.fn(),
  },
}));

vi.mock("@/lib/auth-helpers", () => mockAuthHelpers);
vi.mock("@/lib/invite-token", () => mockInviteToken);

import { POST } from "@/app/api/trips/[id]/invite/route";

const mockAuth = mockAuthHelpers.getAuthUserId;
const mockIsHost = mockAuthHelpers.isHost;
const mockCreate = mockInviteToken.createInviteToken;

function tripParams(id = "1") {
  return { params: Promise.resolve({ id }) };
}

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/trips/{id}/invite — 초대 링크 생성 (#194)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("builds invite URL from request origin — dev", async () => {
    mockAuth.mockResolvedValue("user1");
    mockIsHost.mockResolvedValue(true);
    mockCreate.mockResolvedValue("TOKEN_DEV");

    const res = await POST(
      jsonRequest("https://dev.trip.idean.me/api/trips/1/invite", { role: "HOST" }),
      tripParams(),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.inviteUrl).toBe("https://dev.trip.idean.me/invite/TOKEN_DEV");
  });

  it("builds invite URL from request origin — prod", async () => {
    mockAuth.mockResolvedValue("user1");
    mockIsHost.mockResolvedValue(true);
    mockCreate.mockResolvedValue("TOKEN_PROD");

    const res = await POST(
      jsonRequest("https://trip.idean.me/api/trips/1/invite", { role: "GUEST" }),
      tripParams(),
    );

    const body = await res.json();
    expect(body.inviteUrl).toBe("https://trip.idean.me/invite/TOKEN_PROD");
  });

  it("builds invite URL from request origin — preview (Vercel random)", async () => {
    mockAuth.mockResolvedValue("user1");
    mockIsHost.mockResolvedValue(true);
    mockCreate.mockResolvedValue("TOKEN_PREVIEW");

    const res = await POST(
      jsonRequest("https://trip-planner-abc.vercel.app/api/trips/1/invite", { role: "HOST" }),
      tripParams(),
    );

    const body = await res.json();
    expect(body.inviteUrl).toBe("https://trip-planner-abc.vercel.app/invite/TOKEN_PREVIEW");
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(jsonRequest("https://x.test/api/trips/1/invite", { role: "HOST" }), tripParams());
    expect(res.status).toBe(401);
  });

  it("returns 403 when not a host", async () => {
    mockAuth.mockResolvedValue("user1");
    mockIsHost.mockResolvedValue(false);
    const res = await POST(jsonRequest("https://x.test/api/trips/1/invite", { role: "HOST" }), tripParams());
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid role", async () => {
    mockAuth.mockResolvedValue("user1");
    mockIsHost.mockResolvedValue(true);
    const res = await POST(jsonRequest("https://x.test/api/trips/1/invite", { role: "OWNER" }), tripParams());
    expect(res.status).toBe(400);
  });
});
