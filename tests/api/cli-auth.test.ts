import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ──

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

const mockCreatePAT = vi.fn();
// spec 059 — 자동 발급 만료 헬퍼. 단언 편의를 위해 고정 Date 를 돌린다.
const AUTO_EXPIRY = new Date("2099-01-01T00:00:00.000Z");
vi.mock("@/lib/token-helpers", () => ({
  createPAT: (...args: unknown[]) => mockCreatePAT(...args),
  autoPatExpiry: () => AUTO_EXPIRY,
}));

// ── Import after mocks ──
const { GET } = await import("@/app/api/auth/cli/route");

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost:3000/api/auth/cli");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

describe("GET /api/auth/cli", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 파라미터 검증 ──

  it("returns 400 when port is missing", async () => {
    const res = await GET(makeRequest({ state: "a".repeat(16) }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("port");
  });

  it("returns 400 when state is missing", async () => {
    const res = await GET(makeRequest({ port: "8080" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("state");
  });

  it("returns 400 when port is below 1024", async () => {
    const res = await GET(makeRequest({ port: "80", state: "a".repeat(16) }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("1024-65535");
  });

  it("returns 400 when port is above 65535", async () => {
    const res = await GET(
      makeRequest({ port: "70000", state: "a".repeat(16) }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("1024-65535");
  });

  it("returns 400 when port is not a number", async () => {
    const res = await GET(makeRequest({ port: "abc", state: "a".repeat(16) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when state is shorter than 16 characters", async () => {
    const res = await GET(makeRequest({ port: "8080", state: "short" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("16 characters");
  });

  // ── 미로그인 리다이렉트 ──

  it("redirects to signin when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeRequest({ port: "8080", state: "a".repeat(32) }));
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/auth/signin");
    expect(location).toContain("callbackUrl");
    // port=8080 is URL-encoded inside callbackUrl
    expect(decodeURIComponent(location)).toContain("port=8080");
  });

  // ── 로그인 시 PAT 발급 + localhost 리다이렉트 ──

  it("generates PAT and redirects to localhost when authenticated", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockCreatePAT.mockResolvedValue({
      rawToken: "tp_test_token_abc",
      id: 1,
      name: "CLI (자동 로그인)",
      tokenPrefix: "tp_test_tok",
      expiresAt: null,
      createdAt: new Date(),
    });

    const state = "b".repeat(32);
    const res = await GET(makeRequest({ port: "12345", state }));

    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("http://127.0.0.1:12345/callback");
    expect(location).toContain("token=tp_test_token_abc");
    expect(location).toContain(`state=${state}`);

    // spec 059 — 자동 발급은 단기 만료(autoPatExpiry)를 함께 넘긴다(무만료 아님).
    expect(mockCreatePAT).toHaveBeenCalledWith(
      "user-123",
      "CLI (자동 로그인)",
      AUTO_EXPIRY,
    );
  });

  it("자동 발급 토큰에 만료가 부여된다(무만료 아님)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-9" } });
    mockCreatePAT.mockResolvedValue({
      rawToken: "tp_z",
      id: 1,
      name: "CLI (자동 로그인)",
      tokenPrefix: "tp_z",
      expiresAt: AUTO_EXPIRY,
      createdAt: new Date(),
    });
    await GET(makeRequest({ port: "20000", state: "e".repeat(16) }));
    const thirdArg = mockCreatePAT.mock.calls[0][2];
    expect(thirdArg).toBeInstanceOf(Date);
    expect(thirdArg).not.toBeNull();
  });

  it("accepts port at boundary 1024", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockCreatePAT.mockResolvedValue({
      rawToken: "tp_x",
      id: 1,
      name: "CLI (자동 로그인)",
      tokenPrefix: "tp_x",
      expiresAt: null,
      createdAt: new Date(),
    });

    const res = await GET(makeRequest({ port: "1024", state: "c".repeat(16) }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("127.0.0.1:1024");
  });

  it("accepts port at boundary 65535", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockCreatePAT.mockResolvedValue({
      rawToken: "tp_y",
      id: 1,
      name: "CLI (자동 로그인)",
      tokenPrefix: "tp_y",
      expiresAt: null,
      createdAt: new Date(),
    });

    const res = await GET(
      makeRequest({ port: "65535", state: "d".repeat(16) }),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("127.0.0.1:65535");
  });
});
