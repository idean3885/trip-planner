import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * spec 057 — 검색 노출 최소 회귀 가드.
 *
 * sitemap에 공개 경로만 포함(앱 경로 부재), robots가 앱 경로를 disallow,
 * canonical origin 미설정 시 안전 동작을 검증한다(SC-005, FR-008~010).
 */
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("robots", () => {
  it("앱 본체 경로를 disallow한다", () => {
    vi.stubEnv("APP_PRODUCTION_URL", "https://trip.idean.me");
    const r = robots();
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    const disallow = rule.disallow as string[];
    expect(disallow).toContain("/trips");
    expect(disallow).toContain("/settings");
    expect(disallow).toContain("/api");
    expect(r.sitemap).toBe("https://trip.idean.me/sitemap.xml");
  });

  it("origin 미설정 시 sitemap 키가 없다", () => {
    vi.stubEnv("APP_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    const r = robots();
    expect(r.sitemap).toBeUndefined();
  });
});

describe("sitemap", () => {
  it("공개 페이지만 포함하고 앱 경로는 없다", () => {
    vi.stubEnv("APP_PRODUCTION_URL", "https://trip.idean.me");
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://trip.idean.me");
    expect(urls).toContain("https://trip.idean.me/about");
    expect(urls).toContain("https://trip.idean.me/docs");
    // 앱 본체 경로는 사이트맵에 없어야 한다.
    expect(urls.some((u) => u.includes("/trips"))).toBe(false);
    expect(urls.some((u) => u.includes("/settings"))).toBe(false);
  });

  it("origin 미설정 시 빈 사이트맵", () => {
    vi.stubEnv("APP_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    expect(sitemap()).toEqual([]);
  });
});
