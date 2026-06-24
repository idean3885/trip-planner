import { describe, expect, it } from "vitest";

import {
  isTripInProgress,
  resolveTimingDefault,
  summarize,
} from "@/lib/expense";

// spec 061 — 여행중 판정·디폴트·통화별 합산.

describe("isTripInProgress", () => {
  const trip = { startDate: "2026-06-07", endDate: "2026-06-21" };

  it("여행 기간 내면 true", () => {
    expect(isTripInProgress(trip, new Date("2026-06-10T00:00:00Z"))).toBe(true);
    expect(isTripInProgress(trip, new Date("2026-06-07T23:00:00Z"))).toBe(true);
    expect(isTripInProgress(trip, new Date("2026-06-21T05:00:00Z"))).toBe(true);
  });

  it("여행 전/후면 false", () => {
    expect(isTripInProgress(trip, new Date("2026-06-06T00:00:00Z"))).toBe(false);
    expect(isTripInProgress(trip, new Date("2026-06-22T00:00:00Z"))).toBe(false);
  });

  it("기간 미설정이면 false", () => {
    expect(isTripInProgress(null, new Date())).toBe(false);
    expect(isTripInProgress({ startDate: null, endDate: null })).toBe(false);
  });
});

describe("resolveTimingDefault", () => {
  const trip = { startDate: "2026-06-07", endDate: "2026-06-21" };

  it("여행 중이면 현장(ON_SITE)", () => {
    expect(resolveTimingDefault(trip, new Date("2026-06-10T00:00:00Z"))).toBe(
      "ON_SITE",
    );
  });

  it("여행 전이면 사전(ADVANCE)", () => {
    expect(resolveTimingDefault(trip, new Date("2026-06-01T00:00:00Z"))).toBe(
      "ADVANCE",
    );
  });

  it("기간 미설정이면 사전(ADVANCE)", () => {
    expect(resolveTimingDefault(null)).toBe("ADVANCE");
  });
});

describe("summarize", () => {
  it("통화별 총액·사전/현장 소계를 집계한다", () => {
    const rows = summarize([
      { cost: "10", currency: "EUR", paymentTiming: "ADVANCE" },
      { cost: 5, currency: "EUR", paymentTiming: "ON_SITE" },
      { cost: "20", currency: "EUR", paymentTiming: "ON_SITE" },
      { cost: "1000", currency: "KRW", paymentTiming: "ADVANCE" },
    ]);
    const eur = rows.find((r) => r.currency === "EUR")!;
    expect(eur.total).toBe(35);
    expect(eur.advance).toBe(10);
    expect(eur.onSite).toBe(25);
    const krw = rows.find((r) => r.currency === "KRW")!;
    expect(krw.total).toBe(1000);
    expect(krw.advance).toBe(1000);
  });

  it("비용 없음/0은 합계에 기여하지 않는다", () => {
    const rows = summarize([
      { cost: null, currency: "EUR", paymentTiming: "ON_SITE" },
      { cost: "", currency: "EUR", paymentTiming: "ON_SITE" },
      { cost: "0", currency: "EUR", paymentTiming: "ON_SITE" },
    ]);
    expect(rows).toHaveLength(0);
  });

  it("미지정 paymentTiming은 현장으로 집계", () => {
    const rows = summarize([{ cost: "7", currency: "EUR" }]);
    expect(rows[0].onSite).toBe(7);
    expect(rows[0].advance).toBe(0);
  });
});
