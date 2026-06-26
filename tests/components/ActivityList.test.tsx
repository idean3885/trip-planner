import type { ActivityCategory, PaymentTiming } from "@prisma/client";
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

function makeActivity(overrides = {}) {
  return {
    id: 1,
    category: "SIGHTSEEING" as ActivityCategory,
    title: "벨렝 탑",
    startTime: "2026-06-07T09:00:00.000Z",
    endTime: "2026-06-07T11:00:00.000Z",
    location: "Lisbon",
    memo: null,
    cost: null,
    currency: "EUR",
    paymentTiming: "ON_SITE" as PaymentTiming,
    sortOrder: 0,
    ...overrides,
  };
}

// #794 — 편집은 카드 직접 진입이 아니라 본문 탭 → 읽기전용 상세 → "편집" 순.
function openEdit(title = "벨렝 탑") {
  fireEvent.click(screen.getByRole("button", { name: `${title} 상세` }));
  fireEvent.click(screen.getByText("편집"));
}

describe("ActivityList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  it("renders activity cards with count", () => {
    const activities = [
      makeActivity(),
      makeActivity({ id: 2, title: "점심 식사", sortOrder: 1 }),
    ];
    render(
      <ActivityList
        tripId={1}
        dayId={1}
        activities={activities}
        canEdit={false}
      />,
    );
    expect(screen.getByText("벨렝 탑")).toBeInTheDocument();
    expect(screen.getByText("점심 식사")).toBeInTheDocument();
    expect(screen.getByText("활동 (2)")).toBeInTheDocument();
  });

  it("renders legacy HH:mm value verbatim in list (no T, no ISO conversion)", () => {
    const activities = [makeActivity({ startTime: "08:30", endTime: "09:45" })];
    render(
      <ActivityList
        tripId={1}
        dayId={1}
        activities={activities}
        canEdit={false}
      />,
    );
    // ActivityList 내부의 formatTime이 T 미포함 값을 그대로 반환 (legacy 방어 경로)
    expect(screen.getByText(/08:30/)).toBeInTheDocument();
  });

  it("does not show heading when no activities", () => {
    render(
      <ActivityList tripId={1} dayId={1} activities={[]} canEdit={true} />,
    );
    expect(screen.queryByText(/활동 \(/)).not.toBeInTheDocument();
  });

  // #846 — 활동 추가(생성)는 ActivityList 가 아니라 화면 하단 떠 있는
  // TripQuickAdd 가 담당한다. 추가 관련 검증은 TripQuickAdd.test.tsx 로 옮겼다.
  // 여기서는 조회·편집·삭제·정렬·빈 상태만 검증한다.

  it("calls delete API and removes card", async () => {
    const activities = [makeActivity()];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(
      <ActivityList
        tripId={1}
        dayId={1}
        activities={activities}
        canEdit={true}
      />,
    );
    fireEvent.click(screen.getByText("삭제"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/trips/1/days/1/activities/1",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  it("shows error toast when update API fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const activities = [makeActivity()];
    render(
      <ActivityList
        tripId={1}
        dayId={1}
        activities={activities}
        canEdit={true}
      />,
    );
    openEdit();

    const form = document.querySelector("form")!;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("활동 수정에 실패했습니다");
    });
  });

  it("shows error toast when delete API fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const activities = [makeActivity()];
    render(
      <ActivityList
        tripId={1}
        dayId={1}
        activities={activities}
        canEdit={true}
      />,
    );
    fireEvent.click(screen.getByText("삭제"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("활동 삭제에 실패했습니다");
    });
  });

  it("shows error toast when update fetch throws (network)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network"));

    const activities = [makeActivity()];
    render(
      <ActivityList
        tripId={1}
        dayId={1}
        activities={activities}
        canEdit={true}
      />,
    );
    openEdit();
    const form = document.querySelector("form")!;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "활동 수정 중 오류가 발생했습니다",
      );
    });
  });

  it("shows error toast when delete fetch throws (network)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network"));

    const activities = [makeActivity()];
    render(
      <ActivityList
        tripId={1}
        dayId={1}
        activities={activities}
        canEdit={true}
      />,
    );
    fireEvent.click(screen.getByText("삭제"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "활동 삭제 중 오류가 발생했습니다",
      );
    });
  });

  it("update keeps other activities unchanged (map false branch)", async () => {
    const updated = makeActivity({ id: 1, title: "Updated" });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => updated });

    const activities = [
      makeActivity({ id: 1, title: "First" }),
      makeActivity({ id: 2, title: "Second" }),
    ];
    render(
      <ActivityList
        tripId={1}
        dayId={1}
        activities={activities}
        canEdit={true}
      />,
    );
    // 첫 activity의 상세 → 편집
    openEdit("First");
    const form = document.querySelector("form")!;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText("Updated")).toBeInTheDocument();
    });
    // 두 번째 activity는 변경 없이 그대로
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("update sends cost as parsed float (truthy branch)", async () => {
    const updated = makeActivity({ id: 1, cost: 42.5 });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => updated });

    const activities = [makeActivity({ id: 1, cost: 10 })];
    render(
      <ActivityList
        tripId={1}
        dayId={1}
        activities={activities}
        canEdit={true}
      />,
    );
    openEdit();
    const costInput = screen.getByRole("spinbutton");
    fireEvent.change(costInput, { target: { value: "42.5" } });
    const form = document.querySelector("form")!;
    fireEvent.submit(form);
    await waitFor(() => {
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(callBody.cost).toBe(42.5);
    });
  });

  it("does not delete when confirm is cancelled", async () => {
    (global.confirm as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
    const activities = [makeActivity()];

    render(
      <ActivityList
        tripId={1}
        dayId={1}
        activities={activities}
        canEdit={true}
      />,
    );
    fireEvent.click(screen.getByText("삭제"));

    await new Promise((r) => setTimeout(r, 50));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows edit form when edit clicked", () => {
    const activities = [makeActivity()];
    render(
      <ActivityList
        tripId={1}
        dayId={1}
        activities={activities}
        canEdit={true}
      />,
    );
    openEdit();
    expect(screen.getByText("수정")).toBeInTheDocument();
    expect(screen.getByDisplayValue("벨렝 탑")).toBeInTheDocument();
  });

  it("cancels edit and returns to card", () => {
    const activities = [makeActivity()];
    render(
      <ActivityList
        tripId={1}
        dayId={1}
        activities={activities}
        canEdit={true}
      />,
    );
    openEdit();
    fireEvent.click(screen.getByText("취소"));
    expect(screen.getByText("벨렝 탑")).toBeInTheDocument();
    expect(screen.queryByText("수정")).not.toBeInTheDocument();
  });

  it("calls update API on edit submit", async () => {
    const updated = makeActivity({ title: "Updated" });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => updated });

    const activities = [makeActivity()];
    render(
      <ActivityList
        tripId={1}
        dayId={1}
        activities={activities}
        canEdit={true}
      />,
    );
    openEdit();

    const form = document.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/trips/1/days/1/activities/1",
        expect.objectContaining({ method: "PUT" }),
      );
    });
  });

  it("sends null for empty optional fields on update", async () => {
    const updated = makeActivity({
      title: "Cleared",
      startTime: null,
      endTime: null,
      location: null,
      memo: null,
      cost: null,
    });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => updated });

    // Activity with all fields filled
    const activities = [
      makeActivity({
        startTime: "2026-06-07T09:00:00.000Z",
        endTime: "2026-06-07T11:00:00.000Z",
        location: "Place",
        memo: "Note",
        cost: "25",
        paymentTiming: "ON_SITE",
      }),
    ];
    render(
      <ActivityList
        tripId={1}
        dayId={1}
        activities={activities}
        canEdit={true}
      />,
    );
    openEdit();

    // 라벨로 선택 비우기(편집은 확장 상태).
    fireEvent.change(screen.getByLabelText("장소"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("내용"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("가격"), { target: { value: "" } });
    const timeInputs = document.querySelectorAll('input[type="time"]');
    fireEvent.change(timeInputs[0], { target: { value: "" } });
    fireEvent.change(timeInputs[1], { target: { value: "" } });

    const form = document.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.startTime).toBeNull();
      expect(callBody.endTime).toBeNull();
      expect(callBody.location).toBeNull();
      expect(callBody.memo).toBeNull();
      expect(callBody.cost).toBeNull();
      expect(callBody.paymentTiming).toBe("ON_SITE");
    });
  });

  it("moves activity down", async () => {
    const activities = [
      makeActivity({ id: 1, sortOrder: 0 }),
      makeActivity({ id: 2, title: "Second", sortOrder: 1 }),
    ];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(
      <ActivityList
        tripId={1}
        dayId={1}
        activities={activities}
        canEdit={true}
      />,
    );
    const downButtons = screen.getAllByLabelText("아래로");
    fireEvent.click(downButtons[0]);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/trips/1/days/1/activities",
        expect.objectContaining({ method: "PATCH" }),
      );
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.orderedIds).toEqual([2, 1]);
    });
  });

  it("shows edit form with null fields converted to empty strings", () => {
    const activities = [
      makeActivity({
        startTime: null,
        endTime: null,
        location: null,
        memo: null,
        cost: null,
      }),
    ];
    render(
      <ActivityList
        tripId={1}
        dayId={1}
        activities={activities}
        canEdit={true}
      />,
    );
    openEdit();
    expect(screen.getByText("수정")).toBeInTheDocument();
    // Null fields should become empty inputs, not "null"
    expect(screen.queryByDisplayValue("null")).not.toBeInTheDocument();
  });

  it("shows edit form with cost as string", () => {
    const activities = [makeActivity({ cost: "42.50" })];
    render(
      <ActivityList
        tripId={1}
        dayId={1}
        activities={activities}
        canEdit={true}
      />,
    );
    openEdit();
    expect(screen.getByDisplayValue("42.50")).toBeInTheDocument();
  });

  it("does not move first item up (boundary)", async () => {
    const activities = [
      makeActivity({ id: 1 }),
      makeActivity({ id: 2, title: "Second", sortOrder: 1 }),
    ];
    render(
      <ActivityList
        tripId={1}
        dayId={1}
        activities={activities}
        canEdit={true}
      />,
    );

    const upButtons = screen.getAllByLabelText("위로");
    // First item's up button is disabled, clicking should not trigger fetch
    fireEvent.click(upButtons[0]);
    await new Promise((r) => setTimeout(r, 50));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does not move last item down (boundary)", async () => {
    const activities = [
      makeActivity({ id: 1 }),
      makeActivity({ id: 2, title: "Second", sortOrder: 1 }),
    ];
    render(
      <ActivityList
        tripId={1}
        dayId={1}
        activities={activities}
        canEdit={true}
      />,
    );

    const downButtons = screen.getAllByLabelText("아래로");
    // Last item's down button is disabled
    fireEvent.click(downButtons[1]);
    await new Promise((r) => setTimeout(r, 50));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("moves activity up", async () => {
    const activities = [
      makeActivity({ id: 1, sortOrder: 0 }),
      makeActivity({ id: 2, title: "Second", sortOrder: 1 }),
    ];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(
      <ActivityList
        tripId={1}
        dayId={1}
        activities={activities}
        canEdit={true}
      />,
    );
    const upButtons = screen.getAllByLabelText("위로");
    fireEvent.click(upButtons[1]); // second item's up button

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/trips/1/days/1/activities",
        expect.objectContaining({ method: "PATCH" }),
      );
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.orderedIds).toEqual([2, 1]);
    });
  });

  it("삭제 시 onActivitiesChange 로 상위 캐시에 변경을 통지한다(#669)", async () => {
    const onActivitiesChange = vi.fn();
    const activities = [
      makeActivity({ id: 1, sortOrder: 0 }),
      makeActivity({ id: 2, title: "Second", sortOrder: 1 }),
    ];
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    render(
      <ActivityList
        tripId={1}
        dayId={1}
        activities={activities}
        canEdit
        onActivitiesChange={onActivitiesChange}
      />,
    );
    fireEvent.click(screen.getAllByText("삭제")[0]);
    await waitFor(() => expect(onActivitiesChange).toHaveBeenCalled());
    // (dayId, next) 시그니처 — dayId 먼저, 남은 활동 배열이 둘째 인자.
    const lastCall = onActivitiesChange.mock.calls.at(-1) as [
      number,
      { id: number }[],
    ];
    expect(lastCall[0]).toBe(1); // dayId
    expect(lastCall[1].map((a) => a.id)).toEqual([2]);
  });

  // spec 058 — 활동 0건이면 빈 상태를 카드로 분명히 보인다.
  it("shows empty-state card when there are no activities", () => {
    render(
      <ActivityList tripId={1} dayId={1} activities={[]} canEdit={false} />,
    );
    expect(screen.getByText("등록된 활동이 없습니다.")).toBeInTheDocument();
  });

  it("shows empty-state card even when editable (add lives outside)", () => {
    // #846 — 추가가 떠 있는 TripQuickAdd 로 빠졌으므로, 편집 가능해도 목록은
    // 빈 상태 카드만 보인다.
    render(<ActivityList tripId={1} dayId={1} activities={[]} canEdit />);
    expect(screen.getByText("등록된 활동이 없습니다.")).toBeInTheDocument();
    expect(screen.queryByText("+ 활동 추가")).toBeNull();
  });
});
