import type { ActivityCategory, ReservationStatus } from "@prisma/client";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ActivityList from "@/components/ActivityList";

// #740 — 종일/시간 분리 + 최상단 접힘 섹션.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast: mockToast }));
global.fetch = vi.fn();

function makeActivity(overrides = {}) {
  return {
    id: 1,
    category: "SIGHTSEEING" as ActivityCategory,
    title: "벨렝 탑",
    startTime: "2026-06-07T09:00:00.000Z",
    startTimezone: "Europe/Lisbon",
    endTime: "2026-06-07T11:00:00.000Z",
    endTimezone: "Europe/Lisbon",
    location: "Lisbon",
    memo: null,
    cost: null,
    currency: "EUR",
    reservationStatus: null as ReservationStatus | null,
    allDay: false,
    sortOrder: 0,
    ...overrides,
  };
}

describe("ActivityList — 종일 섹션", () => {
  beforeEach(() => vi.clearAllMocks());

  it("종일 활동은 최상단 별도 섹션(기본 접힘)에 모이고 시간 활동은 아래 유지", () => {
    const activities = [
      makeActivity({ id: 1, title: "리스본 호텔", allDay: true }),
      makeActivity({ id: 2, title: "벨렝 탑", allDay: false, sortOrder: 1 }),
    ];
    render(
      <ActivityList tripId={1} dayId={1} activities={activities} canEdit />,
    );

    const summary = screen.getByText("종일 (1)");
    const details = summary.closest("details") as HTMLDetailsElement;
    expect(details).toBeTruthy();
    // 기본 접힘.
    expect(details.open).toBe(false);
    // 종일 섹션 안에 종일 활동.
    expect(details.textContent).toContain("리스본 호텔");
    // 시간 섹션 헤더.
    expect(screen.getByText("활동 (1)")).toBeTruthy();
  });

  it("종일 활동이 없으면 종일 섹션을 보이지 않는다", () => {
    render(
      <ActivityList
        tripId={1}
        dayId={1}
        activities={[makeActivity({ allDay: false })]}
        canEdit
      />,
    );
    expect(screen.queryByText(/^종일 \(/)).toBeNull();
    expect(screen.getByText("활동 (1)")).toBeTruthy();
  });

  it("종일 카드는 시간 대신 '종일'을 표시한다", () => {
    render(
      <ActivityList
        tripId={1}
        dayId={1}
        activities={[makeActivity({ title: "포르투 숙소", allDay: true })]}
        canEdit={false}
      />,
    );
    expect(screen.getByText("종일", { selector: "*" })).toBeTruthy();
  });
});
