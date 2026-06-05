import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSession = vi.fn();
vi.mock("@/lib/auth-helpers", () => ({ getSession: () => mockGetSession() }));
const mockCreatePAT = vi.fn();
vi.mock("@/lib/token-helpers", () => ({
  createPAT: (...a: unknown[]) => mockCreatePAT(...a),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { personalAccessToken: { findMany: vi.fn() } },
}));

const { POST } = await import("@/app/api/tokens/route");

function req(body: object) {
  return new Request("http://localhost/api/tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// spec 059 — 수기 발급 만료 정책은 자동 발급 단기 만료 도입의 영향을 받지 않는다.
describe("POST /api/tokens 수기 발급 회귀 가드 (spec 059)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: "u1" } });
    mockCreatePAT.mockResolvedValue({
      id: 1,
      name: "x",
      rawToken: "tp_x",
      tokenPrefix: "tp_x",
      expiresAt: null,
      createdAt: new Date(),
    });
  });

  it("expiresAt 미지정 시 무만료(null)를 유지한다", async () => {
    const res = await POST(req({ name: "my token" }));
    expect(res.status).toBe(201);
    expect(mockCreatePAT).toHaveBeenCalledWith("u1", "my token", null);
  });

  it("expiresAt 지정 시 그 만료를 사용한다", async () => {
    await POST(req({ name: "t", expiresAt: "2099-01-01T00:00:00.000Z" }));
    const third = mockCreatePAT.mock.calls[0][2];
    expect(third).toBeInstanceOf(Date);
  });
});
