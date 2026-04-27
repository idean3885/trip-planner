/**
 * spec 024 (#416) — provider capability 노출이 plan.md 명시값과 일치하는지 검증.
 * SC-008: 호출자 코드가 provider id 직접 비교가 아닌 capability 분기를 사용하는지의
 * 정적 보장은 본 테스트로 일부 보강 (capability 객체 모양 자체).
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
import { getProvider } from "@/lib/calendar/provider/registry";

describe("ProviderCapabilities — 노출 정합", () => {
  it("Google capability는 모두 자동 지원", () => {
    expect(googleProvider.capabilities).toEqual({
      autoMemberAcl: "auto",
      supportsCalendarCreation: true,
      supportsCalendarSelection: true,
    });
  });

  it("registry getProvider('GOOGLE')은 googleProvider와 동일 객체", () => {
    expect(getProvider("GOOGLE")).toBe(googleProvider);
  });

  it("registry getProvider('APPLE')은 #417 명시 throw", () => {
    expect(() => getProvider("APPLE")).toThrowError(/#417/);
  });
});
