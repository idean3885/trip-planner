import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// spec 062 — 근사 환율 확보: 캐시 우선 → 미스 시 외부 1회 → upsert, 실패 시 null.

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    exchangeRate: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { getApproxRate, getRatesForPairs } from "@/lib/fx/rates";

describe("getApproxRate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.exchangeRate.upsert.mockResolvedValue({});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("KRW 는 환율 없이 1, 외부 호출·조회 없음", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const rate = await getApproxRate("KRW", "2026-06-14");
    expect(rate).toBe(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockPrisma.exchangeRate.findUnique).not.toHaveBeenCalled();
  });

  it("캐시 적중 시 외부 호출 0", async () => {
    mockPrisma.exchangeRate.findUnique.mockResolvedValue({
      rateToKrw: "1480.5",
    });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const rate = await getApproxRate("EUR", "2026-06-14");
    expect(rate).toBe(1480.5);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("캐시 미스 시 외부 1회 호출 후 캐시 upsert", async () => {
    mockPrisma.exchangeRate.findUnique.mockResolvedValue(null);
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rates: { KRW: 1490 } }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    const rate = await getApproxRate("EUR", "2026-06-14");
    expect(rate).toBe(1490);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(mockPrisma.exchangeRate.upsert).toHaveBeenCalledTimes(1);
  });

  it("외부 호출 실패 시 null (현화-only fallback)", async () => {
    mockPrisma.exchangeRate.findUnique.mockResolvedValue(null);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    );
    const rate = await getApproxRate("EUR", "2026-06-14");
    expect(rate).toBeNull();
    expect(mockPrisma.exchangeRate.upsert).not.toHaveBeenCalled();
  });

  it("네트워크 예외 시 null", async () => {
    mockPrisma.exchangeRate.findUnique.mockResolvedValue(null);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network")),
    );
    const rate = await getApproxRate("USD", "2026-06-14");
    expect(rate).toBeNull();
  });
});

describe("getRatesForPairs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.exchangeRate.upsert.mockResolvedValue({});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("중복 (일자,통화) 는 한 번만 확보하고 맵으로 묶는다", async () => {
    mockPrisma.exchangeRate.findUnique.mockResolvedValue(null);
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rates: { KRW: 1480 } }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const map = await getRatesForPairs([
      { base: "EUR", date: "2026-06-14" },
      { base: "EUR", date: "2026-06-14" }, // 중복
      { base: "KRW", date: "2026-06-14" }, // 기준 통화 제외
    ]);
    expect(map["2026-06-14"]?.EUR).toBe(1480);
    expect(map["2026-06-14"]?.KRW).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("확보 실패한 통화는 맵에서 누락(병기 생략 신호)", async () => {
    mockPrisma.exchangeRate.findUnique.mockResolvedValue(null);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    );
    const map = await getRatesForPairs([{ base: "XYZ", date: "2026-06-14" }]);
    expect(map["2026-06-14"]).toBeUndefined();
  });
});
