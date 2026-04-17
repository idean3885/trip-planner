import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getAppOrigin, getCanonicalOrigin } from "@/lib/app-url";

describe("getAppOrigin — Layer 1 (내부 링크)", () => {
  it("returns origin from request URL — dev", () => {
    const req = new Request("https://dev.trip.idean.me/api/trips/1/invite");
    expect(getAppOrigin(req)).toBe("https://dev.trip.idean.me");
  });

  it("returns origin from request URL — prod", () => {
    const req = new Request("https://trip.idean.me/api/trips/1");
    expect(getAppOrigin(req)).toBe("https://trip.idean.me");
  });

  it("preserves port for localhost", () => {
    const req = new Request("http://localhost:3000/api/foo");
    expect(getAppOrigin(req)).toBe("http://localhost:3000");
  });

  it("returns origin even with query/hash", () => {
    const req = new Request("https://preview.vercel.app/api/foo?bar=1");
    expect(getAppOrigin(req)).toBe("https://preview.vercel.app");
  });
});

describe("getCanonicalOrigin — Layer 3 (외부 노출용)", () => {
  const originalAppProd = process.env.APP_PRODUCTION_URL;
  const originalVercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;

  beforeEach(() => {
    delete process.env.APP_PRODUCTION_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  });

  afterEach(() => {
    if (originalAppProd !== undefined) process.env.APP_PRODUCTION_URL = originalAppProd;
    else delete process.env.APP_PRODUCTION_URL;
    if (originalVercelProd !== undefined) process.env.VERCEL_PROJECT_PRODUCTION_URL = originalVercelProd;
    else delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  });

  it("prefers APP_PRODUCTION_URL over VERCEL_PROJECT_PRODUCTION_URL", () => {
    process.env.APP_PRODUCTION_URL = "https://trip.idean.me";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "trip-planner.vercel.app";
    expect(getCanonicalOrigin()).toBe("https://trip.idean.me");
  });

  it("falls back to VERCEL_PROJECT_PRODUCTION_URL and adds https://", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "trip-planner.vercel.app";
    expect(getCanonicalOrigin()).toBe("https://trip-planner.vercel.app");
  });

  it("returns null when neither env is set", () => {
    expect(getCanonicalOrigin()).toBeNull();
  });

  it("strips trailing slash", () => {
    process.env.APP_PRODUCTION_URL = "https://trip.idean.me/";
    expect(getCanonicalOrigin()).toBe("https://trip.idean.me");
  });

  it("preserves explicit http:// scheme", () => {
    process.env.APP_PRODUCTION_URL = "http://localhost:3000";
    expect(getCanonicalOrigin()).toBe("http://localhost:3000");
  });
});
