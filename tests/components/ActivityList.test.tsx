import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ActivityList from "@/components/ActivityList";
import type { ActivityCategory, ReservationStatus } from "@prisma/client";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.confirm
global.confirm = vi.fn(() => true);

function makeActivity(overrides = {}) {
  return {
    id: 1,
    category: "SIGHTSEEING" as ActivityCategory,
    title: "벨렝 탑",
    startTime: "09:00",
    endTime: "11:00",
    location: "Lisbon",
    memo: null,
    cost: null,
    currency: "EUR",
    reservationStatus: null as ReservationStatus | null,
    sortOrder: 0,
    ...overrides,
  };
}

describe("ActivityList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  it("renders activity cards", () => {
    const activities = [makeActivity(), makeActivity({ id: 2, title: "점심 식사", category: "DINING", sortOrder: 1 })];
    render(<ActivityList tripId={1} dayId={1} activities={activities} canEdit={false} />);
    expect(screen.getByText("벨렝 탑")).toBeInTheDocument();
    expect(screen.getByText("점심 식사")).toBeInTheDocument();
    expect(screen.getByText("활동 (2)")).toBeInTheDocument();
  });

  it("shows add button when canEdit", () => {
    render(<ActivityList tripId={1} dayId={1} activities={[]} canEdit={true} />);
    expect(screen.getByText("+ 활동 추가")).toBeInTheDocument();
  });

  it("hides add button when cannot edit", () => {
    render(<ActivityList tripId={1} dayId={1} activities={[]} canEdit={false} />);
    expect(screen.queryByText("+ 활동 추가")).not.toBeInTheDocument();
  });

  it("shows form when add button clicked", () => {
    render(<ActivityList tripId={1} dayId={1} activities={[]} canEdit={true} />);
    fireEvent.click(screen.getByText("+ 활동 추가"));
    expect(screen.getByText("추가")).toBeInTheDocument(); // submit button
    expect(screen.getByText("취소")).toBeInTheDocument();
  });

  it("hides form when cancel clicked", () => {
    render(<ActivityList tripId={1} dayId={1} activities={[]} canEdit={true} />);
    fireEvent.click(screen.getByText("+ 활동 추가"));
    fireEvent.click(screen.getByText("취소"));
    expect(screen.getByText("+ 활동 추가")).toBeInTheDocument();
  });

  it("calls create API on form submit", async () => {
    const created = makeActivity({ id: 99, title: "New" });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => created });

    render(<ActivityList tripId={1} dayId={1} activities={[]} canEdit={true} />);
    fireEvent.click(screen.getByText("+ 활동 추가"));

    // Fill required title
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "New Activity" } });

    const form = document.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/trips/1/days/1/activities",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("calls delete API and removes card", async () => {
    const activities = [makeActivity()];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<ActivityList tripId={1} dayId={1} activities={activities} canEdit={true} />);
    fireEvent.click(screen.getByText("삭제"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/trips/1/days/1/activities/1",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  it("shows edit form when edit clicked", () => {
    const activities = [makeActivity()];
    render(<ActivityList tripId={1} dayId={1} activities={activities} canEdit={true} />);
    fireEvent.click(screen.getByText("편집"));
    expect(screen.getByText("수정")).toBeInTheDocument(); // edit mode submit
    expect(screen.getByDisplayValue("벨렝 탑")).toBeInTheDocument();
  });

  it("calls update API on edit submit", async () => {
    const updated = makeActivity({ title: "Updated" });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => updated });

    const activities = [makeActivity()];
    render(<ActivityList tripId={1} dayId={1} activities={activities} canEdit={true} />);
    fireEvent.click(screen.getByText("편집"));

    const form = document.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/trips/1/days/1/activities/1",
        expect.objectContaining({ method: "PUT" })
      );
    });
  });

  it("calls reorder API on move", async () => {
    const activities = [
      makeActivity({ id: 1, sortOrder: 0 }),
      makeActivity({ id: 2, title: "Second", sortOrder: 1 }),
    ];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<ActivityList tripId={1} dayId={1} activities={activities} canEdit={true} />);

    // Move first down
    const downButtons = screen.getAllByLabelText("아래로");
    fireEvent.click(downButtons[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/trips/1/days/1/activities",
        expect.objectContaining({ method: "PATCH" })
      );
    });
  });
});
