/**
 * spec 025 (#417) — appleProvider.classifyError가 CalDAV 응답을 6종 vocabulary로
 * 정규화하는지 검증.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("tsdav", () => ({ createDAVClient: vi.fn() }));

import { appleProvider } from "@/lib/calendar/provider/apple";

describe("appleProvider.classifyError — 6종 vocabulary 매핑", () => {
  it("status=401 → auth_invalid", () => {
    expect(appleProvider.classifyError({ status: 401 })).toBe("auth_invalid");
  });

  it("status=412 → precondition_failed", () => {
    expect(appleProvider.classifyError({ status: 412 })).toBe("precondition_failed");
  });

  it("status=429 → transient_failure", () => {
    expect(appleProvider.classifyError({ status: 429 })).toBe("transient_failure");
  });

  it("status=500 → transient_failure", () => {
    expect(appleProvider.classifyError({ status: 503 })).toBe("transient_failure");
  });

  it("Error message에 fetch failed → transient_failure", () => {
    expect(appleProvider.classifyError(new Error("fetch failed"))).toBe(
      "transient_failure",
    );
  });

  it("Error message에 ECONNREFUSED → transient_failure", () => {
    expect(appleProvider.classifyError(new Error("connect ECONNREFUSED 127.0.0.1"))).toBe(
      "transient_failure",
    );
  });

  it("status=404 → null (vocabulary 외)", () => {
    expect(appleProvider.classifyError({ status: 404 })).toBeNull();
  });

  it("response.status로 status 추출", () => {
    expect(appleProvider.classifyError({ response: { status: 401 } })).toBe(
      "auth_invalid",
    );
  });

  it("Error message에 '401' 포함 시 status 추출", () => {
    expect(appleProvider.classifyError(new Error("HTTP 401 Unauthorized"))).toBe(
      "auth_invalid",
    );
  });

  it("status 추출 불가 + 네트워크 키워드 부재 → null", () => {
    expect(appleProvider.classifyError(new Error("totally unknown error"))).toBeNull();
  });

  it("status=200 (정상) → null (에러 아님)", () => {
    expect(appleProvider.classifyError({ status: 200 })).toBeNull();
  });
});
