/**
 * spec 032 — 선택 날짜 일정 패널 인라인 CRUD (FR-003, FR-011).
 *
 * day 가 있으면 ActivityList 로 활동을 보여주고, 없으면 빈 안내 + (편집 권한
 * 시) "일정 추가" 버튼을 보인다. 빈 날짜에서 추가하면 POST /days 로 Day 를
 * 생성하고 onDayCreated 콜백을 호출한다.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DayActivitiesPane } from "@/components/trip/DayActivitiesPane";
import type { ActivityCategory } from "@prisma/client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast: mockToast }));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const SELECTED = new Date(2026, 5, 9);

describe("DayActivitiesPane", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("선택 날짜를 헤더에 표시한다", () => {
    render(
      <DayActivitiesPane
        tripId={1}
        selectedDate={SELECTED}
        day={null}
        canEdit={false}
        onDayCreated={vi.fn()}
      />,
    );
    expect(screen.getByText("이 날짜에 등록된 일정이 없습니다.")).toBeInTheDocument();
  });

  it("day 가 있으면 ActivityList 로 활동을 보여준다", () => {
    render(
      <DayActivitiesPane
        tripId={1}
        selectedDate={SELECTED}
        day={{
          id: 10,
          activities: [
            {
              id: 1,
              category: "SIGHTSEEING" as ActivityCategory,
              title: "벨렝 탑",
              startTime: null,
              endTime: null,
              location: null,
              memo: null,
              cost: null,
              currency: "EUR",
              reservationStatus: null,
              sortOrder: 0,
            },
          ],
        }}
        canEdit={false}
        onDayCreated={vi.fn()}
      />,
    );
    expect(screen.getByText("벨렝 탑")).toBeInTheDocument();
  });

  it("편집 권한 없으면 빈 날짜에 추가 버튼이 없다", () => {
    render(
      <DayActivitiesPane
        tripId={1}
        selectedDate={SELECTED}
        day={null}
        canEdit={false}
        onDayCreated={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /일정 추가/ })).not.toBeInTheDocument();
  });

  it("빈 날짜에서 추가하면 POST /days 후 onDayCreated 를 호출한다", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 42, date: "2026-06-09" }),
    });
    const onDayCreated = vi.fn();
    render(
      <DayActivitiesPane
        tripId={1}
        selectedDate={SELECTED}
        day={null}
        canEdit
        onDayCreated={onDayCreated}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /일정 추가/ }));
    await waitFor(() => expect(onDayCreated).toHaveBeenCalledWith({ id: 42, date: "2026-06-09" }));
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/trips/1/days",
      expect.objectContaining({ method: "POST" }),
    );
    // 로컬 YYYY-MM-DD 로 선택 날짜를 전송한다.
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.date).toBe("2026-06-09");
  });

  it("다른 날짜(다른 Day)로 바뀌면 그 날짜의 일정으로 갱신된다(#645 key 리셋)", () => {
    const mk = (id: number, title: string) => ({
      id,
      category: "SIGHTSEEING" as ActivityCategory,
      title,
      startTime: null,
      endTime: null,
      location: null,
      memo: null,
      cost: null,
      currency: "EUR",
      reservationStatus: null,
      sortOrder: 1,
    });
    const { rerender } = render(
      <DayActivitiesPane
        tripId={1}
        selectedDate={new Date(2026, 5, 8)}
        day={{ id: 10, activities: [mk(1, "리스본 도착")] }}
        canEdit={false}
        onDayCreated={vi.fn()}
      />,
    );
    expect(screen.getByText("리스본 도착")).toBeInTheDocument();
    // 다른 날짜(다른 Day id) 선택 → 새 일정만 보이고 이전 일정은 사라진다.
    rerender(
      <DayActivitiesPane
        tripId={1}
        selectedDate={new Date(2026, 5, 9)}
        day={{ id: 11, activities: [mk(2, "포르투 이동")] }}
        canEdit={false}
        onDayCreated={vi.fn()}
      />,
    );
    expect(screen.getByText("포르투 이동")).toBeInTheDocument();
    expect(screen.queryByText("리스본 도착")).not.toBeInTheDocument();
  });
});
