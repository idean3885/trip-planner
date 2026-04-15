import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ActivityList from "@/components/ActivityList";
import type { ActivityCategory, ReservationStatus } from "@prisma/client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;
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

  it("renders activity cards with count", () => {
    const activities = [makeActivity(), makeActivity({ id: 2, title: "점심 식사", sortOrder: 1 })];
    render(<ActivityList tripId={1} dayId={1} activities={activities} canEdit={false} />);
    expect(screen.getByText("벨렝 탑")).toBeInTheDocument();
    expect(screen.getByText("점심 식사")).toBeInTheDocument();
    expect(screen.getByText("활동 (2)")).toBeInTheDocument();
  });

  it("does not show heading when no activities", () => {
    render(<ActivityList tripId={1} dayId={1} activities={[]} canEdit={true} />);
    expect(screen.queryByText(/활동 \(/)).not.toBeInTheDocument();
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
    expect(screen.getByText("추가")).toBeInTheDocument();
    expect(screen.getByText("취소")).toBeInTheDocument();
  });

  it("hides form and shows add button when cancel clicked", () => {
    render(<ActivityList tripId={1} dayId={1} activities={[]} canEdit={true} />);
    fireEvent.click(screen.getByText("+ 활동 추가"));
    fireEvent.click(screen.getByText("취소"));
    expect(screen.getByText("+ 활동 추가")).toBeInTheDocument();
  });

  it("creates activity with all optional fields", async () => {
    const created = makeActivity({
      id: 99, title: "New", startTime: "10:00", endTime: "12:00",
      location: "Place", memo: "Note", cost: 25, currency: "USD",
      reservationStatus: "REQUIRED",
    });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => created });

    render(<ActivityList tripId={1} dayId={1} activities={[]} canEdit={true} />);
    fireEvent.click(screen.getByText("+ 활동 추가"));

    // Fill all fields
    const textInputs = screen.getAllByRole("textbox");
    fireEvent.change(textInputs[0], { target: { value: "New" } }); // title
    fireEvent.change(textInputs[1], { target: { value: "Place" } }); // location
    fireEvent.change(textInputs[2], { target: { value: "Note" } }); // memo

    const costInput = screen.getByRole("spinbutton");
    fireEvent.change(costInput, { target: { value: "25" } });

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[selects.length - 1], { target: { value: "REQUIRED" } }); // reservation

    const form = document.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/trips/1/days/1/activities",
        expect.objectContaining({ method: "POST" })
      );
      // Check body includes optional fields
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.title).toBe("New");
      expect(callBody.location).toBe("Place");
      expect(callBody.memo).toBe("Note");
      expect(callBody.reservationStatus).toBe("REQUIRED");
    });
  });

  it("creates activity with minimal fields", async () => {
    const created = makeActivity({ id: 50, title: "Minimal" });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => created });

    render(<ActivityList tripId={1} dayId={1} activities={[]} canEdit={true} />);
    fireEvent.click(screen.getByText("+ 활동 추가"));

    const textInputs = screen.getAllByRole("textbox");
    fireEvent.change(textInputs[0], { target: { value: "Minimal" } });

    const form = document.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.title).toBe("Minimal");
      // Optional fields should NOT be in body
      expect(callBody.location).toBeUndefined();
      expect(callBody.memo).toBeUndefined();
      expect(callBody.cost).toBeUndefined();
      expect(callBody.reservationStatus).toBeUndefined();
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

  it("does not delete when confirm is cancelled", async () => {
    (global.confirm as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
    const activities = [makeActivity()];

    render(<ActivityList tripId={1} dayId={1} activities={activities} canEdit={true} />);
    fireEvent.click(screen.getByText("삭제"));

    await new Promise((r) => setTimeout(r, 50));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows edit form when edit clicked", () => {
    const activities = [makeActivity()];
    render(<ActivityList tripId={1} dayId={1} activities={activities} canEdit={true} />);
    fireEvent.click(screen.getByText("편집"));
    expect(screen.getByText("수정")).toBeInTheDocument();
    expect(screen.getByDisplayValue("벨렝 탑")).toBeInTheDocument();
  });

  it("cancels edit and returns to card", () => {
    const activities = [makeActivity()];
    render(<ActivityList tripId={1} dayId={1} activities={activities} canEdit={true} />);
    fireEvent.click(screen.getByText("편집"));
    fireEvent.click(screen.getByText("취소"));
    expect(screen.getByText("벨렝 탑")).toBeInTheDocument();
    expect(screen.queryByText("수정")).not.toBeInTheDocument();
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

  it("moves activity down", async () => {
    const activities = [
      makeActivity({ id: 1, sortOrder: 0 }),
      makeActivity({ id: 2, title: "Second", sortOrder: 1 }),
    ];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<ActivityList tripId={1} dayId={1} activities={activities} canEdit={true} />);
    const downButtons = screen.getAllByLabelText("아래로");
    fireEvent.click(downButtons[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/trips/1/days/1/activities",
        expect.objectContaining({ method: "PATCH" })
      );
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.orderedIds).toEqual([2, 1]);
    });
  });

  it("moves activity up", async () => {
    const activities = [
      makeActivity({ id: 1, sortOrder: 0 }),
      makeActivity({ id: 2, title: "Second", sortOrder: 1 }),
    ];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<ActivityList tripId={1} dayId={1} activities={activities} canEdit={true} />);
    const upButtons = screen.getAllByLabelText("위로");
    fireEvent.click(upButtons[1]); // second item's up button

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/trips/1/days/1/activities",
        expect.objectContaining({ method: "PATCH" })
      );
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.orderedIds).toEqual([2, 1]);
    });
  });
});
