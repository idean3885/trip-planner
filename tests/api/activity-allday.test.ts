import { beforeEach, describe, expect, it, vi } from "vitest";

// #740 — 종일 활동 저장(앵커) + 종일 ICS(VALUE=DATE).
const { mockPrisma, mockAuthHelpers } = vi.hoisted(() => ({
  mockPrisma: {
    activity: { create: vi.fn() },
    day: { findUnique: vi.fn() },
  },
  mockAuthHelpers: { getAuthUserId: vi.fn(), canEdit: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth-helpers", () => mockAuthHelpers);
vi.mock("@/lib/calendar/auto-sync", () => ({
  triggerCalendarAutoSync: vi.fn(),
}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (fn: () => void) => fn(),
}));

import { POST } from "@/app/api/trips/[id]/days/[dayId]/activities/route";
import { formatActivityAsIcs } from "@/lib/calendar/ics";

const params = { params: Promise.resolve({ id: "5", dayId: "76" }) };
function req(body: unknown) {
  return new Request("http://localhost/api/trips/5/days/76/activities", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST 활동 — 종일 저장", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthHelpers.getAuthUserId.mockResolvedValue("user1");
    mockAuthHelpers.canEdit.mockResolvedValue(true);
    mockPrisma.day.findUnique.mockResolvedValue({
      id: 76,
      tripId: 5,
      date: new Date("2026-06-07T00:00:00.000Z"),
    });
    mockPrisma.activity.create.mockResolvedValue({ id: 159, allDay: true });
  });

  it("allDay=true면 시각을 그 날 날짜로 앵커하고 시간대는 비운다", async () => {
    const res = await POST(
      req({ category: "ACCOMMODATION", title: "리스본 호텔", allDay: true }),
      params,
    );
    expect(res.status).toBe(201);
    const data = mockPrisma.activity.create.mock.calls[0][0].data;
    expect(data.allDay).toBe(true);
    expect(data.startTime).toEqual(new Date("2026-06-07T00:00:00.000Z"));
    expect(data.endTime).toBeNull();
    expect(data.startTimezone).toBeNull();
  });

  it("allDay 미지정이면 시간 활동(allDay=false)으로 저장", async () => {
    await POST(
      req({
        category: "SIGHTSEEING",
        title: "벨렝 탑",
        startTime: "09:00",
        startTimezone: "Europe/Lisbon",
      }),
      params,
    );
    const data = mockPrisma.activity.create.mock.calls[0][0].data;
    expect(data.allDay).toBe(false);
  });
});

describe("ICS — 종일 이벤트", () => {
  const trip = { id: 5, title: "신혼여행" };
  const base = {
    title: "리스본 호텔",
    category: "ACCOMMODATION" as const,
    startTime: new Date("2026-06-07T00:00:00.000Z"),
    startTimezone: null,
    endTime: null,
    endTimezone: null,
    location: null,
    memo: null,
    reservationStatus: null,
  };

  it("종일 활동은 VALUE=DATE 종일 이벤트로 내보낸다", () => {
    const ics = formatActivityAsIcs({ ...base, allDay: true }, trip, {
      tripUrl: "https://trip.idean.me/trips/5",
    });
    expect(ics).toContain("DTSTART;VALUE=DATE:20260607");
    // DTEND 는 배타적 — 다음 날.
    expect(ics).toContain("DTEND;VALUE=DATE:20260608");
  });

  it("시간 활동은 기존 시각 형식(VALUE=DATE 아님)", () => {
    const ics = formatActivityAsIcs(
      {
        ...base,
        allDay: false,
        startTime: new Date("2026-06-09T10:30:00.000Z"),
        endTime: new Date("2026-06-09T11:30:00.000Z"),
        startTimezone: "Europe/Lisbon",
        endTimezone: "Europe/Lisbon",
      },
      trip,
      { tripUrl: "https://trip.idean.me/trips/5" },
    );
    expect(ics).not.toContain("VALUE=DATE");
    expect(ics).toContain("DTSTART;TZID=Europe/Lisbon:");
  });
});
