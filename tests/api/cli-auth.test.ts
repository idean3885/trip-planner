import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

const mockCreatePAT = vi.fn();
vi.mock("@/lib/token-helpers", () => ({
  createPAT: (...args: unknown[]) => mockCreatePAT(...args),
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
    const res = await GET(
      makeRequest({ port: "80", state: "a".repeat(16) }),
    );
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
    const res = await GET(
      makeRequest({ port: "abc", state: "a".repeat(16) }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when state is shorter than 16 characters", async () => {
    const res = await GET(
      makeRequest({ port: "8080", state: "short" }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("16 characters");
  });

  // ── 미로그인 리다이렉트 ──

  it("redirects to signin when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(
      makeRequest({ port: "8080", state: "a".repeat(32) }),
    );
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
    const res = await GET(
      makeRequest({ port: "12345", state }),
    );

    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("http://127.0.0.1:12345/callback");
    expect(location).toContain("token=tp_test_token_abc");
    expect(location).toContain(`state=${state}`);

    expect(mockCreatePAT).toHaveBeenCalledWith(
      "user-123",
      "CLI (자동 로그인)",
    );
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

    const res = await GET(
      makeRequest({ port: "1024", state: "c".repeat(16) }),
    );
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
