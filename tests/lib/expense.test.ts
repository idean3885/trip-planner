import { describe, expect, it } from "vitest";

import {
  convertToKrw,
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

describe("convertToKrw", () => {
  const RATES = {
    "2026-06-14": { EUR: 1480 },
    "2026-06-15": { EUR: 1500, JPY: 9 },
  };

  it("일자별 환율로 환산해 합한다", () => {
    const r = convertToKrw(
      [
        { cost: "10", currency: "EUR", dateYmd: "2026-06-14" }, // 14800
        { cost: "10", currency: "EUR", dateYmd: "2026-06-15" }, // 15000
      ],
      RATES,
    );
    expect(r.krw).toBe(29800);
    expect(r.partial).toBe(false);
    expect(r.anyConverted).toBe(true);
  });

  it("KRW 항목은 환율 없이 그대로 가산", () => {
    const r = convertToKrw(
      [
        { cost: "5000", currency: "KRW", dateYmd: "2026-06-14" },
        { cost: "10", currency: "EUR", dateYmd: "2026-06-14" }, // 14800
      ],
      RATES,
    );
    expect(r.krw).toBe(19800);
    expect(r.partial).toBe(false);
  });

  it("환율 미확보 통화는 합에서 제외하고 partial=true", () => {
    const r = convertToKrw(
      [
        { cost: "10", currency: "EUR", dateYmd: "2026-06-14" }, // 14800
        { cost: "100", currency: "GBP", dateYmd: "2026-06-14" }, // 미확보
      ],
      RATES,
    );
    expect(r.krw).toBe(14800);
    expect(r.partial).toBe(true);
    expect(r.anyConverted).toBe(true);
  });

  it("모두 미확보면 anyConverted=false, krw=0, partial=true", () => {
    const r = convertToKrw(
      [{ cost: "100", currency: "GBP", dateYmd: "2026-06-14" }],
      RATES,
    );
    expect(r.anyConverted).toBe(false);
    expect(r.krw).toBe(0);
    expect(r.partial).toBe(true);
  });

  it("0/미입력은 기여하지 않는다", () => {
    const r = convertToKrw(
      [
        { cost: null, currency: "EUR", dateYmd: "2026-06-14" },
        { cost: "0", currency: "EUR", dateYmd: "2026-06-14" },
      ],
      RATES,
    );
    expect(r.krw).toBe(0);
    expect(r.partial).toBe(false);
    expect(r.anyConverted).toBe(false);
  });

  it("같은 일자 다통화를 각 환율로 환산", () => {
    const r = convertToKrw(
      [
        { cost: "10", currency: "EUR", dateYmd: "2026-06-15" }, // 15000
        { cost: "1000", currency: "JPY", dateYmd: "2026-06-15" }, // 9000
      ],
      RATES,
    );
    expect(r.krw).toBe(24000);
    expect(r.partial).toBe(false);
  });

  it("적용 기준 환율을 통화별로 노출 — 다일자는 가중 평균", () => {
    const r = convertToKrw(
      [
        { cost: "10", currency: "EUR", dateYmd: "2026-06-14" }, // 1480
        { cost: "30", currency: "EUR", dateYmd: "2026-06-15" }, // 1500
      ],
      RATES,
    );
    // (10*1480 + 30*1500) / 40 = 1495
    expect(r.rates).toEqual([{ currency: "EUR", perUnitKrw: 1495 }]);
  });

  it("미확보 통화는 기준 환율 목록에서 빠진다", () => {
    const r = convertToKrw(
      [
        { cost: "10", currency: "EUR", dateYmd: "2026-06-14" },
        { cost: "100", currency: "GBP", dateYmd: "2026-06-14" }, // 미확보
        { cost: "5000", currency: "KRW", dateYmd: "2026-06-14" }, // 기준 통화
      ],
      RATES,
    );
    expect(r.rates).toEqual([{ currency: "EUR", perUnitKrw: 1480 }]);
  });
});
