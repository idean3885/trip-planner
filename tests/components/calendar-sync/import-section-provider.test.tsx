/**
 * spec 058 — ImportSection provider 섹션 분리 검증.
 *
 * 가져오기 화면에서 Apple·Google 이 각각 제목이 붙은 별도 섹션으로 구분되고,
 * 각 섹션이 자기 provider 의 연결·미연결·목록을 자기 영역 안에서 보인다(US5).
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
  mockFetch.mockResolvedValue({ ok: true, json: async () => body });
}

describe("ImportSection — provider 섹션 분리", () => {
  it("Apple·Google 섹션 제목이 각각 노출된다", async () => {
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
      expect(
        screen.getByRole("heading", { name: "Apple 캘린더" }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { name: "Google 캘린더" }),
    ).toBeInTheDocument();
  });

  it("가져올 캘린더는 자기 provider 섹션 안에 표시된다", async () => {
    mockExternalCalendars({
      calendars: [
        {
          provider: "GOOGLE",
          externalCalendarId: "g-1",
          displayName: "내 구글 캘린더",
          accountLabel: null,
          isManagedByTripPlanner: false,
        },
      ],
      diagnostics: {
        unfilteredCount: 1,
        managedFilteredCount: 0,
        notConnected: ["APPLE"],
        scopeInsufficient: [],
        errors: [],
      },
    });

    render(<ImportSection tripId={1} role="OWNER" onImported={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText("내 구글 캘린더")).toBeInTheDocument();
    });
    // Apple 은 미연결 안내를 자기 섹션 안에 보인다.
    expect(screen.getByText("Apple 연결하기")).toBeInTheDocument();
    // 가져오기 버튼은 하단에 단일로 노출.
    expect(
      screen.getByRole("button", { name: "가져오기" }),
    ).toBeInTheDocument();
  });
});
