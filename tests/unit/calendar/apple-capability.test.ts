/**
 * spec 025 (#417) — appleProvider.capabilities가 plan.md 명시값 그대로인지 검증.
 *
 * 라우트·service는 본 capability를 읽어 분기한다. provider 식별자 직접 비교(SC-008
 * spec 024)를 금지한다.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("tsdav", () => ({ createDAVClient: vi.fn() }));

import { appleProvider } from "@/lib/calendar/provider/apple";

describe("appleProvider.capabilities", () => {
  it("autoMemberAcl == 'manual'", () => {
    expect(appleProvider.capabilities.autoMemberAcl).toBe("manual");
  });

  it("supportsCalendarCreation == true (MKCALENDAR 작동)", () => {
    expect(appleProvider.capabilities.supportsCalendarCreation).toBe(true);
  });

  it("supportsCalendarSelection == true (기존 선택 옵션)", () => {
    expect(appleProvider.capabilities.supportsCalendarSelection).toBe(true);
  });
});

describe("appleProvider 인터페이스 식별자", () => {
  it("id == 'APPLE'", () => {
    expect(appleProvider.id).toBe("APPLE");
  });
});

describe("appleProvider.upsertMemberAcl/revokeMemberAcl — manual capability 안전망", () => {
  it("upsertMemberAcl은 호출되어도 throw 없이 반환 (no-op)", async () => {
    await expect(
      appleProvider.upsertMemberAcl({
        userId: "u1",
        calendarId: "https://caldav.icloud.com/u1/cal/",
        memberEmail: "m@example.com",
        role: "writer",
      }),
    ).resolves.toBeUndefined();
  });

  it("revokeMemberAcl은 항상 revoked:false + retainedReason 반환", async () => {
    const result = await appleProvider.revokeMemberAcl({
      userId: "u1",
      calendarId: "https://caldav.icloud.com/u1/cal/",
      memberEmail: "m@example.com",
      retainIfStillNeeded: true,
    });
    expect(result.revoked).toBe(false);
    expect(result.retainedReason).toContain("manual");
  });
});
