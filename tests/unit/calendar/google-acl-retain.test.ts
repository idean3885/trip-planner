/**
 * spec 024 (#416) — googleProvider.revokeMemberAcl의 retain 판정.
 *
 * 핵심: retainIfStillNeeded=true일 때 같은 calendarId+memberEmail가 다른
 * 활성 link(같은 ownerId, NOT current trip, ADDED subscription)에 존재하면
 * 회수 보류.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/prisma", () => {
  const findFirst = vi.fn();
  return {
    prisma: {
      tripCalendarLink: { findFirst },
    },
  };
});

vi.mock("@/lib/gcal/client", () => ({
  getCalendarClient: vi.fn(),
}));

vi.mock("@/lib/gcal/acl", () => ({
  upsertAcl: vi.fn(),
  deleteAcl: vi.fn(),
}));

import { googleProvider } from "@/lib/calendar/provider/google";
import { prisma } from "@/lib/prisma";
import { getCalendarClient } from "@/lib/gcal/client";
import { deleteAcl } from "@/lib/gcal/acl";

const mockedFindFirst = prisma.tripCalendarLink.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockedGetClient = getCalendarClient as unknown as ReturnType<typeof vi.fn>;
const mockedDeleteAcl = deleteAcl as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("googleProvider.revokeMemberAcl — retain 판정", () => {
  it("retainIfStillNeeded=true + 다른 활성 link 존재 → 보류", async () => {
    mockedFindFirst.mockResolvedValueOnce({ id: 99, tripId: 7 });

    const result = await googleProvider.revokeMemberAcl({
      userId: "owner-1",
      calendarId: "cal-A",
      memberEmail: "guest@example.com",
      retainIfStillNeeded: true,
    });

    expect(result.revoked).toBe(false);
    expect(result.retainedReason).toContain("tripId=7");
    // deleteAcl 호출 없음 (보류)
    expect(mockedDeleteAcl).not.toHaveBeenCalled();
  });

  it("retainIfStillNeeded=true + 다른 활성 link 없음 → 회수 진행", async () => {
    mockedFindFirst.mockResolvedValueOnce(null);
    mockedGetClient.mockResolvedValueOnce({ calendar: {} });
    mockedDeleteAcl.mockResolvedValueOnce({ ok: true, status: 204 });

    const result = await googleProvider.revokeMemberAcl({
      userId: "owner-1",
      calendarId: "cal-A",
      memberEmail: "guest@example.com",
      retainIfStillNeeded: true,
    });

    expect(result.revoked).toBe(true);
    expect(mockedDeleteAcl).toHaveBeenCalledTimes(1);
  });

  it("retainIfStillNeeded=false → retain 검사 없이 즉시 회수", async () => {
    mockedGetClient.mockResolvedValueOnce({ calendar: {} });
    mockedDeleteAcl.mockResolvedValueOnce({ ok: true, status: 204 });

    const result = await googleProvider.revokeMemberAcl({
      userId: "owner-1",
      calendarId: "cal-A",
      memberEmail: "guest@example.com",
      retainIfStillNeeded: false,
    });

    expect(result.revoked).toBe(true);
    expect(mockedFindFirst).not.toHaveBeenCalled();
    expect(mockedDeleteAcl).toHaveBeenCalledTimes(1);
  });
});
