/**
 * spec 057 — ImportSection 빈 상태 안내 카피 검증.
 *
 * 가져올 캘린더가 없을 때 안내 문구에 프로젝트 코드명이 노출되지 않음을 확인한다(SC-001).
 */
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import ImportSection from "@/components/calendar-sync/sections/ImportSection";

beforeEach(() => {
  vi.clearAllMocks();
});

function mockExternalCalendars(body: unknown) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => body,
  });
}

describe("ImportSection — 빈 상태 카피", () => {
  it("관리 캘린더만 있어 가져올 게 없을 때 코드명이 없다", async () => {
    mockExternalCalendars({
      calendars: [
        {
          provider: "GOOGLE",
          externalCalendarId: "managed-1",
          displayName: "여행",
          accountLabel: null,
          isManagedByTripPlanner: true,
        },
      ],
      diagnostics: {
        unfilteredCount: 1,
        managedFilteredCount: 1,
        notConnected: [],
        scopeInsufficient: [],
        errors: [],
      },
    });

    render(<ImportSection tripId={1} role="OWNER" onImported={() => {}} />);

    await waitFor(() => {
      // spec 058 — provider 섹션별 빈 안내(Apple·Google 각 1건).
      expect(
        screen.getAllByText("가져올 수 있는 캘린더가 없습니다."),
      ).toHaveLength(2);
    });
    // 빈 상태 안내 어디에도 코드명이 없어야 한다.
    const region = document.body.innerHTML;
    expect(region).not.toContain("trip-planner");
  });

  it("연결 캘린더가 없을 때 안내에 코드명이 없다", async () => {
    mockExternalCalendars({
      calendars: [],
      diagnostics: {
        unfilteredCount: 0,
        managedFilteredCount: 0,
        notConnected: [],
        scopeInsufficient: [],
        errors: [],
      },
    });

    render(<ImportSection tripId={1} role="OWNER" onImported={() => {}} />);

    await waitFor(() => {
      // spec 058 — provider 섹션별 빈 안내(Apple·Google 각 1건).
      expect(
        screen.getAllByText("가져올 수 있는 캘린더가 없습니다."),
      ).toHaveLength(2);
    });
    expect(document.body.innerHTML).not.toContain("trip-planner");
  });
});
