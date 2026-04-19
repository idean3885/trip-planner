import { describe, it, expect, vi } from "vitest";

vi.mock("@/auth.config", () => ({ default: { providers: [], pages: { signIn: "/auth/signin" } } }));

// next-auth wrapper: make `auth(handler)` return the handler as-is so we can invoke it directly.
vi.mock("next-auth", () => ({
  default: () => ({
    auth: (handler: (req: unknown) => unknown) => handler,
  }),
}));

import middleware from "@/middleware";

type FakeReq = { auth: unknown; nextUrl: URL };

function makeReq(url: string, loggedIn: boolean): FakeReq {
  return { auth: loggedIn ? { user: { id: "u1" } } : null, nextUrl: new URL(url) };
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

  it("allows /about and /docs as public routes", () => {
    expect(middleware(makeReq("https://x.test/about", false) as never, {} as never)).toBeUndefined();
    expect(middleware(makeReq("https://x.test/docs/api", false) as never, {} as never)).toBeUndefined();
  });
});
