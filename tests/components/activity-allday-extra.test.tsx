import type { ActivityCategory, PaymentTiming } from "@prisma/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ActivityForm from "@/components/ActivityForm";
import ActivityList from "@/components/ActivityList";

// #740 — 그룹 경계 건너뛰는 이동 + 폼 종일 토글 커버.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast: mockToast }));
const mockFetch = vi.fn();
global.fetch = mockFetch;

function makeActivity(overrides = {}) {
  return {
    id: 1,
    category: "SIGHTSEEING" as ActivityCategory,
    title: "활동",
    startTime: "2026-06-07T09:00:00.000Z",
    startTimezone: "Europe/Lisbon",
    endTime: "2026-06-07T11:00:00.000Z",
    endTimezone: "Europe/Lisbon",
    location: null,
    memo: null,
    cost: null,
    currency: "EUR",
    paymentTiming: "ON_SITE" as PaymentTiming,
    allDay: false,
    sortOrder: 0,
    ...overrides,
  };
}

describe("ActivityList — 이동은 종일 그룹 경계를 건너뛴다", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  it("시간 활동을 위로 옮기면 사이의 종일 항목을 건너뛰고 시간 항목끼리 교환", async () => {
    // 배열 순서: 시간1(id1) · 종일(id2) · 시간3(id3)
    const activities = [
      makeActivity({ id: 1, title: "시간1", allDay: false, sortOrder: 0 }),
      makeActivity({ id: 2, title: "종일", allDay: true, sortOrder: 1 }),
      makeActivity({ id: 3, title: "시간3", allDay: false, sortOrder: 2 }),
    ];
    render(
      <ActivityList tripId={1} dayId={1} activities={activities} canEdit />,
    );
    // 시간 그룹에서 마지막 시간3만 "위로" 버튼이 보인다.
    const upButtons = screen.getAllByLabelText("위로");
    fireEvent.click(upButtons[upButtons.length - 1]);

    await waitFor(() => {
      const patch = mockFetch.mock.calls.find((c) => c[1]?.method === "PATCH");
      expect(patch).toBeTruthy();
      // 종일(id2)을 건너뛰고 시간1↔시간3 교환 → [3,2,1]
      expect(JSON.parse(patch![1].body)).toEqual({ orderedIds: [3, 2, 1] });
    });
  });
});

describe("ActivityForm — 종일 토글", () => {
  it("종일 체크 시 시각 입력이 사라진다", () => {
    render(<ActivityForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    // spec 061 — 생성은 간소 모드. 확장해야 시간·종일 노출.
    fireEvent.click(screen.getByText(/확장/));
    expect(screen.getByLabelText(/시작/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("종일 (시간 없음)"));
    expect(screen.queryByLabelText(/시작/)).toBeNull();
    expect(screen.queryByLabelText(/종료/)).toBeNull();
  });
});
