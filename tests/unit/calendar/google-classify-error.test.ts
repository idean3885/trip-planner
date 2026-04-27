/**
 * spec 024 (#416) — googleProvider.classifyError가 Google API 응답을
 * 6종 vocabulary로 정규화하는지 검증.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/gcal/client", () => ({ getCalendarClient: vi.fn() }));
vi.mock("@/lib/gcal/auth", () => ({
  hasCalendarScope: vi.fn(),
  buildConsentRedirectUrl: vi.fn(),
}));
vi.mock("@/lib/gcal/acl", () => ({ upsertAcl: vi.fn(), deleteAcl: vi.fn() }));

import { googleProvider } from "@/lib/calendar/provider/google";

describe("googleProvider.classifyError — 6종 vocabulary", () => {
  it("412 Precondition Failed → precondition_failed", () => {
    const err = { code: 412, message: "Precondition Failed" };
    expect(googleProvider.classifyError(err)).toBe("precondition_failed");
  });

  it("401 Unauthorized → revoked", () => {
    // 권한 회수는 lastError === REVOKED → revoked로 매핑
    const err = { code: 401, message: "Invalid Credentials" };
    expect(googleProvider.classifyError(err)).toBe("revoked");
  });

  it("403 일반 Forbidden → revoked (REVOKED last_error)", () => {
    const err = { code: 403, message: "The user has not granted the app access" };
    expect(googleProvider.classifyError(err)).toBe("revoked");
  });

  it("403 + Testing 모드 미등록 키워드 → unregistered_user", () => {
    const err = {
      code: 403,
      message: "Error: access_denied — has not completed the verification process",
    };
    expect(googleProvider.classifyError(err)).toBe("unregistered_user");
  });

  it("429 Too Many Requests → transient_failure", () => {
    const err = { code: 429, message: "Quota exceeded" };
    expect(googleProvider.classifyError(err)).toBe("transient_failure");
  });

  it("500 Server Error → transient_failure", () => {
    const err = { code: 500, message: "Internal" };
    expect(googleProvider.classifyError(err)).toBe("transient_failure");
  });

  it("404 Not Found → null (vocabulary 외)", () => {
    const err = { code: 404, message: "Not Found" };
    expect(googleProvider.classifyError(err)).toBeNull();
  });

  it("status 미상 일반 Error → transient_failure (네트워크 폴백)", () => {
    // status 추출 불가 시 classifyGCalError가 reason="network"로 분류 → transient_failure 매핑.
    expect(googleProvider.classifyError(new Error("totally unknown"))).toBe(
      "transient_failure",
    );
  });
});
