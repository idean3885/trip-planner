/**
 * spec 029 T015 — derived 전환 통합 검증.
 *
 * 4축 (trip 헤더 API · /api/v2/trips/[id] · 외부 캘린더 import · 공유 캘린더 push)
 * 가 derived 기간(getResolvedPeriod/getDerivedPeriod) 정책을 일관되게 따르는지
 * 검증한다.
 *
 * - 응답 startDate/endDate 는 derived (일정 ≥1건) 또는 명목 fallback(일정 0건)
 * - 외부 캘린더 import 는 일정 0건 trip 에 대해 EmptyTripPeriodError 차단
 * - 공유 캘린더 push 는 trip 기간 의존이 없으므로 (활동 단위 처리) derived 정책의
 *   영향 범위 밖이라는 사실을 회귀 검증한다.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, mockAuthHelpers, mockFetcher } = vi.hoisted(() => {
  const fetcher = {
    provider: "GOOGLE" as const,
    isConnected: vi.fn().mockResolvedValue(true),
    listEvents: vi.fn().mockResolvedValue([]),
    listCalendars: vi.fn().mockResolvedValue([]),
  };
  return {
    mockPrisma: {
      day: {
        findUnique: vi.fn(),
        aggregate: vi.fn(),
      },
      trip: {
        findUnique: vi.fn(),
      },
      tripMember: {
        findUnique: vi.fn(),
      },
      importRun: {
        create: vi.fn().mockResolvedValue({ id: 999 }),
        update: vi.fn().mockResolvedValue({ id: 999 }),
      },
      activityDraft: {
        create: vi.fn(),
      },
    },
    mockAuthHelpers: {
      getAuthUserId: vi.fn(),
      getTripMember: vi.fn(),
      canEdit: vi.fn(),
      isOwner: vi.fn(),
    },
    mockFetcher: fetcher,
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth-helpers", () => mockAuthHelpers);
vi.mock("@/lib/calendar-import/google", () => ({
  googleImportFetcher: mockFetcher,
}));
vi.mock("@/lib/calendar-import/apple", () => ({
  appleImportFetcher: { ...mockFetcher, provider: "APPLE" },
}));
vi.mock("@/lib/calendar-import/idempotency", () => ({
  findExistingDraftIds: vi.fn().mockResolvedValue(new Set()),
  ignoreUniqueViolation: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}));
vi.mock("@/lib/permissions/activity", () => ({
  userCanImportCalendar: vi.fn().mockResolvedValue(true),
}));

import { POST as POST_IMPORT } from "@/app/api/trips/[id]/calendar-import/route";
import { GET as GET_V1_TRIP } from "@/app/api/trips/[id]/route";
import { GET as GET_V2_TRIP } from "@/app/api/v2/trips/[id]/route";
import { EmptyTripPeriodError, runImport } from "@/lib/calendar-import/service";

function tripParams(id = "1") {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetcher.isConnected.mockResolvedValue(true);
  mockFetcher.listEvents.mockResolvedValue([]);
  mockPrisma.importRun.create.mockResolvedValue({ id: 999 });
});

describe("spec 029 T015 — trip 응답이 derived 기간을 노출", () => {
  const userId = "user1";
  const tripId = 1;
  const nominalStart = new Date("2026-06-01T00:00:00Z");
  const nominalEnd = new Date("2026-06-30T00:00:00Z");

  it("v2 단건: 일정 ≥1건이면 derived 값을 응답", async () => {
    mockAuthHelpers.getAuthUserId.mockResolvedValue(userId);
    mockAuthHelpers.getTripMember.mockResolvedValue({ role: "OWNER" });
    mockPrisma.trip.findUnique.mockResolvedValue({
      id: tripId,
      title: "test",
      startDate: nominalStart,
      endDate: nominalEnd,
      days: [],
      tripMembers: [],
    });
    const derivedStart = new Date("2026-06-07T00:00:00Z");
    const derivedEnd = new Date("2026-06-21T00:00:00Z");
    mockPrisma.day.aggregate.mockResolvedValue({
      _min: { date: derivedStart },
      _max: { date: derivedEnd },
    });

    const res = await GET_V2_TRIP(
      new Request("http://localhost"),
      tripParams(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(new Date(body.startDate).toISOString()).toBe(
      derivedStart.toISOString(),
    );
    expect(new Date(body.endDate).toISOString()).toBe(derivedEnd.toISOString());
  });

  it("v2 단건: 일정 0건이면 startDate/endDate=null (v3.0.0 contract — 명목 컬럼 제거)", async () => {
    mockAuthHelpers.getAuthUserId.mockResolvedValue(userId);
    mockAuthHelpers.getTripMember.mockResolvedValue({ role: "OWNER" });
    mockPrisma.trip.findUnique.mockResolvedValue({
      id: tripId,
      title: "test",
      days: [],
      tripMembers: [],
    });
    mockPrisma.day.aggregate.mockResolvedValue({
      _min: { date: null },
      _max: { date: null },
    });

    const res = await GET_V2_TRIP(
      new Request("http://localhost"),
      tripParams(),
    );
    const body = await res.json();
    expect(body.startDate).toBeNull();
    expect(body.endDate).toBeNull();
  });

  it("v1 단건: derived 정책 동일 적용", async () => {
    mockAuthHelpers.getAuthUserId.mockResolvedValue(userId);
    mockAuthHelpers.getTripMember.mockResolvedValue({ role: "OWNER" });
    mockPrisma.trip.findUnique.mockResolvedValue({
      id: tripId,
      title: "test",
      startDate: nominalStart,
      endDate: nominalEnd,
      days: [],
      tripMembers: [],
    });
    const derivedStart = new Date("2026-06-05T00:00:00Z");
    const derivedEnd = new Date("2026-06-25T00:00:00Z");
    mockPrisma.day.aggregate.mockResolvedValue({
      _min: { date: derivedStart },
      _max: { date: derivedEnd },
    });

    const res = await GET_V1_TRIP(
      new Request("http://localhost"),
      tripParams(),
    );
    const body = await res.json();
    expect(new Date(body.startDate).toISOString()).toBe(
      derivedStart.toISOString(),
    );
    expect(new Date(body.endDate).toISOString()).toBe(derivedEnd.toISOString());
  });
});

describe("spec 029 T015 — 외부 캘린더 import 가 derived 기간 사용 + 0건 차단 (FR-015)", () => {
  const tripId = 1;
  const triggeredByUserId = "user1";

  it("일정 0건 trip 에서 runImport 호출 시 EmptyTripPeriodError 던짐", async () => {
    mockPrisma.trip.findUnique.mockResolvedValue({ id: tripId });
    mockPrisma.day.aggregate.mockResolvedValue({
      _min: { date: null },
      _max: { date: null },
    });

    await expect(
      runImport({
        tripId,
        triggeredByUserId,
        provider: "GOOGLE",
        externalCalendarId: "cal-1",
      }),
    ).rejects.toBeInstanceOf(EmptyTripPeriodError);

    expect(mockFetcher.listEvents).not.toHaveBeenCalled();
    expect(mockPrisma.importRun.create).not.toHaveBeenCalled();
  });

  it("일정 ≥1건 trip 에서 fetcher.listEvents 가 derived 기간 인자로 호출됨", async () => {
    mockPrisma.trip.findUnique.mockResolvedValue({ id: tripId });
    const derivedStart = new Date("2026-06-07T00:00:00Z");
    const derivedEnd = new Date("2026-06-21T00:00:00Z");
    mockPrisma.day.aggregate.mockResolvedValue({
      _min: { date: derivedStart },
      _max: { date: derivedEnd },
    });

    await runImport({
      tripId,
      triggeredByUserId,
      provider: "GOOGLE",
      externalCalendarId: "cal-1",
    });

    expect(mockFetcher.listEvents).toHaveBeenCalledWith(
      triggeredByUserId,
      "cal-1",
      { start: derivedStart, end: derivedEnd },
    );
  });

  it("calendar-import 라우트가 EmptyTripPeriodError 를 422 + empty_trip_period 로 응답", async () => {
    mockAuthHelpers.getAuthUserId.mockResolvedValue(triggeredByUserId);
    mockPrisma.trip.findUnique.mockResolvedValue({ id: tripId });
    mockPrisma.day.aggregate.mockResolvedValue({
      _min: { date: null },
      _max: { date: null },
    });

    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "GOOGLE", externalCalendarId: "cal-1" }),
    });
    const res = await POST_IMPORT(req, tripParams());
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("empty_trip_period");
  });
});

describe("spec 029 T015 — 공유 캘린더 push 는 trip 기간 의존 없음 (FR-016)", () => {
  it("calendar/service 모듈이 trip startDate/endDate 를 직접 select 하지 않는다", async () => {
    const fs = await import("node:fs/promises");
    const source = await fs.readFile("src/lib/calendar/service.ts", "utf8");
    // trip 기간 의존 회귀 방지 — derived 정책 이전 패턴인 startDate/endDate select 가 다시
    // 들어오면 알아챈다. 활동 단위 sync 라 trip period 의존은 0이어야 한다.
    expect(source).not.toMatch(
      /select:\s*\{[^}]*startDate:\s*true[^}]*endDate:\s*true/,
    );
  });
});
