import { describe, it, expect, vi } from "vitest";

vi.mock("@/auth.config", () => ({ default: { providers: [], pages: { signIn: "/auth/signin" } } }));

// next-auth wrapper: make `auth(handler)` return the handler as-is so we can invoke it directly.
vi.mock("next-auth", () => ({
  default: () => ({
    auth: (handler: (req: unknown) => unknown) => handler,
  }),
}));

import middleware from "@/middleware";

interface FakeCookies {
  has: (name: string) => boolean;
}
type FakeReq = { auth: unknown; nextUrl: URL; cookies?: FakeCookies };

function makeReq(url: string, loggedIn: boolean, cookieNames: string[] = []): FakeReq {
  const set = new Set(cookieNames);
  return {
    auth: loggedIn ? { user: { id: "u1" } } : null,
    nextUrl: new URL(url),
    cookies: { has: (name: string) => set.has(name) },
  };
}

describe("middleware", () => {
  it("passes API routes through (no redirect)", () => {
    const res = middleware(makeReq("https://x.test/api/trips", false) as never, {} as never);
    expect(res).toBeUndefined();
  });

  it("redirects logged-in users away from /auth pages to /trips", () => {
    const res = middleware(makeReq("https://x.test/auth/signin", true) as never, {} as never) as Response;
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://x.test/trips");
  });

  it("allows non-logged-in users on /auth pages", () => {
    const res = middleware(makeReq("https://x.test/auth/signin", false) as never, {} as never);
    expect(res).toBeUndefined();
  });

  it("redirects non-logged-in users from invite link with callbackUrl preserved (#189)", () => {
    const res = middleware(
      makeReq("https://x.test/invite/abc.def.ghi?ref=email", false) as never,
      {} as never,
    ) as Response;
    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get("location") ?? "");
    expect(loc.pathname).toBe("/auth/signin");
    expect(loc.searchParams.get("callbackUrl")).toBe("/invite/abc.def.ghi?ref=email");
  });

  it("redirects non-logged-in users from protected routes with callbackUrl", () => {
    const res = middleware(
      makeReq("https://x.test/trips/42", false) as never,
      {} as never,
    ) as Response;
    const loc = new URL(res.headers.get("location") ?? "");
    expect(loc.pathname).toBe("/auth/signin");
    expect(loc.searchParams.get("callbackUrl")).toBe("/trips/42");
  });

  it("allows non-logged-in users on root (landing is public)", () => {
    const res = middleware(makeReq("https://x.test/", false) as never, {} as never);
    expect(res).toBeUndefined();
  });

  it("allows logged-in users on root (page.tsx handles /trips redirect)", () => {
    const res = middleware(makeReq("https://x.test/", true) as never, {} as never);
    expect(res).toBeUndefined();
  });

  it("clears stale Auth.js cookies on signin redirect and marks ?stale=1 (#329)", () => {
    const res = middleware(
      makeReq("https://x.test/trips/42", false, [
        "__Secure-authjs.session-token",
        "__Secure-authjs.pkce.code_verifier",
      ]) as never,
      {} as never,
    ) as Response;
    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get("location") ?? "");
    expect(loc.pathname).toBe("/auth/signin");
    expect(loc.searchParams.get("stale")).toBe("1");

    const setCookies = res.headers.getSetCookie?.() ?? [];
    expect(setCookies.some((c) => c.startsWith("__Secure-authjs.session-token=;"))).toBe(true);
    expect(setCookies.some((c) => c.includes("Max-Age=0"))).toBe(true);
  });

  it("does not add ?stale=1 when no Auth.js cookies are present", () => {
    const res = middleware(
      makeReq("https://x.test/trips/42", false, []) as never,
      {} as never,
    ) as Response;
    const loc = new URL(res.headers.get("location") ?? "");
    expect(loc.searchParams.get("stale")).toBeNull();
  });

  it("allows /about and /docs as public routes", () => {
    expect(middleware(makeReq("https://x.test/about", false) as never, {} as never)).toBeUndefined();
    expect(middleware(makeReq("https://x.test/docs/api", false) as never, {} as never)).toBeUndefined();
  });
});
