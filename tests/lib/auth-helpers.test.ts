import { beforeEach, describe, expect, it, vi } from "vitest";

const mockHeaders = vi.fn();
vi.mock("next/headers", () => ({ headers: () => mockHeaders() }));
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));
const mockPrisma = {
  personalAccessToken: { findUnique: vi.fn(), update: vi.fn() },
};
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const { getAuthUserId } = await import("@/lib/auth-helpers");

function hdrs(authz?: string) {
  return {
    get: (k: string) => (k === "authorization" ? (authz ?? null) : null),
  };
}

describe("getAuthUserId — PAT 만료/세션 (spec 059)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("만료된 PAT 는 null 이고 lastUsedAt 을 갱신하지 않는다", async () => {
    mockHeaders.mockResolvedValue(hdrs("Bearer tp_x"));
    mockPrisma.personalAccessToken.findUnique.mockResolvedValue({
      id: 1,
      userId: "u1",
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(await getAuthUserId()).toBeNull();
    expect(mockPrisma.personalAccessToken.update).not.toHaveBeenCalled();
  });

  it("유효한 PAT 는 userId 를 돌리고 lastUsedAt 을 갱신한다", async () => {
    mockHeaders.mockResolvedValue(hdrs("Bearer tp_x"));
    mockPrisma.personalAccessToken.findUnique.mockResolvedValue({
      id: 1,
      userId: "u1",
      expiresAt: new Date(Date.now() + 1_000_000_000),
    });
    mockPrisma.personalAccessToken.update.mockResolvedValue({});
    expect(await getAuthUserId()).toBe("u1");
    expect(mockPrisma.personalAccessToken.update).toHaveBeenCalled();
  });

  it("무만료(null) PAT 는 유효", async () => {
    mockHeaders.mockResolvedValue(hdrs("Bearer tp_x"));
    mockPrisma.personalAccessToken.findUnique.mockResolvedValue({
      id: 1,
      userId: "u1",
      expiresAt: null,
    });
    mockPrisma.personalAccessToken.update.mockResolvedValue({});
    expect(await getAuthUserId()).toBe("u1");
  });

  it("Bearer 가 없으면 세션으로 폴백한다", async () => {
    mockHeaders.mockResolvedValue(hdrs(undefined));
    mockAuth.mockResolvedValue({ user: { id: "sess-1" } });
    expect(await getAuthUserId()).toBe("sess-1");
  });
});
