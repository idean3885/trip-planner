/**
 * spec 042 US1 — 일정 인터랙션 성공 토스트.
 *
 * ActivityList 는 기존에 실패 토스트만 있었다. 추가·수정·삭제 성공 시에도
 * 성공 토스트로 결과를 알리는지 검증한다(대표로 삭제 플로우).
 */
import type { ActivityCategory, ReservationStatus } from "@prisma/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ActivityList from "@/components/ActivityList";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const mockToast = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: mockToast }));

const mockFetch = vi.fn();
global.fetch = mockFetch;
global.confirm = vi.fn(() => true);

const activity = {
  id: 1,
  category: "SIGHTSEEING" as ActivityCategory,
  title: "벨렝 탑",
  startTime: null,
  endTime: null,
  location: null,
  memo: null,
  cost: null,
  currency: "EUR",
  reservationStatus: null as ReservationStatus | null,
  sortOrder: 0,
};

describe("ActivityList 성공 토스트 (spec 042)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  it("삭제 성공 시 성공 토스트를 띄운다", async () => {
    render(
      <ActivityList tripId={1} dayId={1} activities={[activity]} canEdit />,
    );
    fireEvent.click(screen.getByText("삭제"));
    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledWith("일정을 삭제했습니다"),
    );
  });
});
