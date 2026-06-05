import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * spec 056 — 가져오기(import) 인증 독립성 회귀 가드.
 *
 * 외부 캘린더 내보내기(export) 표면을 제거해도 가져오기는 export 연결
 * (TripCalendarLink)에 의존하지 않고 외부 계정 연결(fetcher.isConnected)만으로
 * 동작/차단됨을 검증한다(SC-003, research Decision 2). prisma mock에는 의도적으로
 * tripCalendarLink를 제공하지 않는다 — runImport가 이를 참조하면 즉시 실패한다.
 */

const { mockPrisma, mockFetcher } = vi.hoisted(() => {
  const fetcher = {
    provider: "GOOGLE" as const,
    isConnected: vi.fn(),
    listEvents: vi.fn().mockResolvedValue([]),
    listCalendars: vi.fn().mockResolvedValue([]),
  };
  return {
    mockPrisma: {
      trip: { findUnique: vi.fn() },
      day: { aggregate: vi.fn() },
      importRun: {
        create: vi.fn().mockResolvedValue({ id: 999 }),
        update: vi.fn().mockResolvedValue({ id: 999 }),
      },
      activityDraft: { create: vi.fn() },
      // tripCalendarLink 의도적 미제공 — runImport가 참조하면 TypeError로 실패.
    },
    mockFetcher: fetcher,
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/calendar-import/google", () => ({
  googleImportFetcher: mockFetcher,
}));
vi.mock("@/lib/calendar-import/apple", () => ({
  appleImportFetcher: { ...mockFetcher, provider: "APPLE" },
}));
vi.mock("@/lib/trip-period", () => ({
  getDerivedPeriod: vi.fn().mockResolvedValue({
    startDate: new Date("2026-06-10T00:00:00Z"),
    endDate: new Date("2026-06-12T00:00:00Z"),
  }),
}));

import {
  ExternalAccountNotLinkedError,
  runImport,
} from "@/lib/calendar-import/service";

beforeEach(() => {
  vi.clearAllMocks();
  mockFetcher.listEvents.mockResolvedValue([]);
});

describe("spec 056 — 가져오기는 export 연결에 독립적", () => {
  it("외부 계정 미연결이면 export 연결과 무관하게 ExternalAccountNotLinkedError", async () => {
    mockFetcher.isConnected.mockResolvedValue(false);
    await expect(
      runImport({
        tripId: 1,
        triggeredByUserId: "user1",
        provider: "GOOGLE",
        externalCalendarId: "cal-1",
      }),
    ).rejects.toBeInstanceOf(ExternalAccountNotLinkedError);
  });

  it("외부 계정 연결 시 TripCalendarLink 없이도 가져오기를 실행한다", async () => {
    mockFetcher.isConnected.mockResolvedValue(true);
    mockPrisma.trip.findUnique.mockResolvedValue({ id: 1 });

    const result = await runImport({
      tripId: 1,
      triggeredByUserId: "user1",
      provider: "GOOGLE",
      externalCalendarId: "cal-1",
    });

    // 연결 게이트는 fetcher.isConnected만 본다(export 링크 조회 없음).
    expect(mockFetcher.isConnected).toHaveBeenCalledWith("user1");
    expect(mockPrisma.importRun.create).toHaveBeenCalled();
    expect(result.importedCount).toBe(0);
  });
});
