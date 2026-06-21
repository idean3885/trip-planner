import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

// #794 — /api/auth/cli 는 PAT 를 직접 발급하지 않고 /bootstrap(fragment 전달)
// 으로 위임하는 thin alias 다. 토큰을 query 로 흘리는 경로가 제거되었는지 검증.
const { GET } = await import("@/app/api/auth/cli/route");

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost:3000/api/auth/cli");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

describe("GET /api/auth/cli (레거시 → /bootstrap 위임, #794)", () => {
  it("port/state 를 보존해 /bootstrap 으로 redirect 한다", async () => {
    const state = "b".repeat(32);
    const res = await GET(makeRequest({ port: "12345", state }));
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/bootstrap");
    expect(location).toContain("port=12345");
    expect(location).toContain(`state=${state}`);
  });

  it("응답에 발급 토큰이 절대 포함되지 않는다(query 노출 0)", async () => {
    const res = await GET(makeRequest({ port: "8080", state: "a".repeat(32) }));
    const location = res.headers.get("location") ?? "";
    expect(location).not.toContain("token=");
    expect(location).not.toContain("127.0.0.1");
    expect(location).toContain("/bootstrap");
  });

  it("쿼리가 없어도 /bootstrap 으로 위임한다", async () => {
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(307);
    expect(res.headers.get("location") ?? "").toContain("/bootstrap");
  });
});
