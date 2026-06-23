import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// spec 060 (#793) — device start/token 라우트 상태머신.

const mockStart = vi.fn();
const mockPoll = vi.fn();
const mockCleanup = vi.fn();
vi.mock("@/lib/device-auth", () => ({
  startDeviceAuthorization: () => mockStart(),
  pollDeviceAuthorization: (c: string) => mockPoll(c),
  cleanupExpired: () => mockCleanup(),
}));

const mockCreatePAT = vi.fn();
const AUTO_EXPIRY = new Date("2099-01-01T00:00:00.000Z");
vi.mock("@/lib/token-helpers", () => ({
  createPAT: (...args: unknown[]) => mockCreatePAT(...args),
  autoPatExpiry: () => AUTO_EXPIRY,
}));

const { POST: startPOST } = await import("@/app/api/auth/device/start/route");
const { POST: tokenPOST } = await import("@/app/api/auth/device/token/route");

function startReq() {
  return new NextRequest(new URL("http://localhost:3000/api/auth/device/start"), {
    method: "POST",
  });
}
function tokenReq(body: unknown) {
  return new NextRequest(new URL("http://localhost:3000/api/auth/device/token"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/device/start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCleanup.mockResolvedValue(0);
  });

  it("device_code/user_code/verification_uri_complete 발급", async () => {
    mockStart.mockResolvedValue({
      deviceCode: "dc-secret",
      userCode: "ABCD-EFGH",
      expiresAt: new Date(Date.now() + 600_000),
      interval: 5,
    });
    const res = await startPOST(startReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.device_code).toBe("dc-secret");
    expect(body.user_code).toBe("ABCD-EFGH");
    expect(body.verification_uri).toContain("/device");
    expect(body.verification_uri_complete).toContain("user_code=ABCD-EFGH");
    expect(body.interval).toBe(5);
    expect(body.expires_in).toBeGreaterThan(0);
  });
});

describe("POST /api/auth/device/token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("device_code 없으면 invalid_request", async () => {
    const res = await tokenPOST(tokenReq({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_request");
  });

  it("pending → authorization_pending", async () => {
    mockPoll.mockResolvedValue({ kind: "pending", interval: 5 });
    const res = await tokenPOST(tokenReq({ device_code: "dc" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("authorization_pending");
  });

  it("slow_down → slow_down + interval", async () => {
    mockPoll.mockResolvedValue({ kind: "slow_down", interval: 10 });
    const res = await tokenPOST(tokenReq({ device_code: "dc" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("slow_down");
    expect(body.interval).toBe(10);
  });

  it("denied → access_denied", async () => {
    mockPoll.mockResolvedValue({ kind: "denied" });
    const res = await tokenPOST(tokenReq({ device_code: "dc" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("access_denied");
  });

  it("expired → expired_token", async () => {
    mockPoll.mockResolvedValue({ kind: "expired" });
    const res = await tokenPOST(tokenReq({ device_code: "dc" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("expired_token");
  });

  it("approved → access_token 발급(createPAT + 단기 만료)", async () => {
    mockPoll.mockResolvedValue({ kind: "approved", userId: "user-7" });
    mockCreatePAT.mockResolvedValue({
      rawToken: "tp_device_abc",
      id: 1,
      name: "CLI (device)",
      tokenPrefix: "tp_device_a",
      expiresAt: AUTO_EXPIRY,
      createdAt: new Date(),
    });
    const res = await tokenPOST(tokenReq({ device_code: "dc" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.access_token).toBe("tp_device_abc");
    expect(body.token_type).toBe("bearer");
    expect(mockCreatePAT).toHaveBeenCalledWith(
      "user-7",
      "CLI (device)",
      AUTO_EXPIRY,
    );
  });
});
