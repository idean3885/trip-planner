import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// spec 062 — 근사 환율 확보: 최종 확정 캐시는 그대로, 잠정(당일)/미스는 외부 갱신.

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    exchangeRate: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { getApproxRate, getRatesForPairs } from "@/lib/fx/rates";

// 그 일자보다 나중에 확보 → 최종 확정으로 간주된다.
const finalRow = (ymd: string, rate: string) => ({
  date: new Date(`${ymd}T00:00:00.000Z`),
  base: "EUR",
  rateToKrw: rate,
  fetchedAt: new Date(new Date(`${ymd}T00:00:00.000Z`).getTime() + 86400000), // +1d
});

describe("getApproxRate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.exchangeRate.upsert.mockResolvedValue({});
  });
  afterEach(() => vi.unstubAllGlobals());

  it("KRW 는 환율 없이 1, 외부 호출·조회 없음", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await getApproxRate("KRW", "2026-06-14")).toBe(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockPrisma.exchangeRate.findUnique).not.toHaveBeenCalled();
  });

  it("최종 확정 캐시 적중 시 외부 호출 0", async () => {
    mockPrisma.exchangeRate.findUnique.mockResolvedValue({
      date: new Date("2026-06-14T00:00:00.000Z"),
      fetchedAt: new Date("2026-06-15T09:00:00.000Z"), // 다음날 확보 → 최종
      rateToKrw: "1480.5",
    });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await getApproxRate("EUR", "2026-06-14")).toBe(1480.5);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("당일 잠정 캐시는 갱신(외부 재호출)한다", async () => {
    mockPrisma.exchangeRate.findUnique.mockResolvedValue({
      date: new Date("2026-06-14T00:00:00.000Z"),
      fetchedAt: new Date("2026-06-14T12:00:00.000Z"), // 같은 날 → 잠정
      rateToKrw: "1480",
    });
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rates: { KRW: 1495 } }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    expect(await getApproxRate("EUR", "2026-06-14")).toBe(1495);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(mockPrisma.exchangeRate.upsert).toHaveBeenCalledTimes(1);
  });

  it("캐시 미스 시 외부 1회 후 upsert", async () => {
    mockPrisma.exchangeRate.findUnique.mockResolvedValue(null);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rates: { KRW: 1490 } }) }),
    );
    expect(await getApproxRate("EUR", "2026-06-14")).toBe(1490);
    expect(mockPrisma.exchangeRate.upsert).toHaveBeenCalledTimes(1);
  });

  it("외부 실패 + 잠정 캐시 있으면 직전 실측값으로 폴백", async () => {
    mockPrisma.exchangeRate.findUnique.mockResolvedValue({
      date: new Date("2026-06-14T00:00:00.000Z"),
      fetchedAt: new Date("2026-06-14T12:00:00.000Z"),
      rateToKrw: "1480",
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    expect(await getApproxRate("EUR", "2026-06-14")).toBe(1480);
  });

  it("외부 실패 + 캐시 없으면 null", async () => {
    mockPrisma.exchangeRate.findUnique.mockResolvedValue(null);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("net")));
    expect(await getApproxRate("USD", "2026-06-14")).toBeNull();
  });
});

describe("getRatesForPairs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.exchangeRate.upsert.mockResolvedValue({});
  });
  afterEach(() => vi.unstubAllGlobals());

  it("캐시를 단일 findMany 로 일괄 읽고, 최종 확정이면 외부 호출 0", async () => {
    mockPrisma.exchangeRate.findMany.mockResolvedValue([finalRow("2026-06-14", "1480")]);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const map = await getRatesForPairs([
      { base: "EUR", date: "2026-06-14" },
      { base: "EUR", date: "2026-06-14" }, // 중복
      { base: "KRW", date: "2026-06-14" }, // 기준 통화 제외
    ]);
    expect(map["2026-06-14"]?.EUR).toBe(1480);
    expect(mockPrisma.exchangeRate.findMany).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("빈 통화 집합(KRW만)이면 조회 없이 빈 맵", async () => {
    const map = await getRatesForPairs([{ base: "KRW", date: "2026-06-14" }]);
    expect(map).toEqual({});
    expect(mockPrisma.exchangeRate.findMany).not.toHaveBeenCalled();
  });

  it("캐시 미스는 외부로 채우고, 실패분은 맵에서 누락", async () => {
    mockPrisma.exchangeRate.findMany.mockResolvedValue([]); // 전부 미스
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) =>
        url.includes("from=EUR")
          ? Promise.resolve({ ok: true, json: async () => ({ rates: { KRW: 1480 } }) })
          : Promise.resolve({ ok: false, json: async () => ({}) }),
      ),
    );
    const map = await getRatesForPairs([
      { base: "EUR", date: "2026-06-14" },
      { base: "XYZ", date: "2026-06-14" },
    ]);
    expect(map["2026-06-14"]?.EUR).toBe(1480);
    expect(map["2026-06-14"]?.XYZ).toBeUndefined();
  });
});
