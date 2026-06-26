import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TripQuickAdd } from "@/components/trip/TripQuickAdd";

// #846 — 화면 하단에 떠 있는 단일 "활동 추가". 선택 일자에 Day 가 없으면 먼저
// 만든 뒤 활동을 추가하고, 저장 후에도 폼을 비운 채 유지(연속 추가)한다.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast: mockToast }));

const mockFetch = vi.fn();
global.fetch = mockFetch;

function setup(props: Partial<Parameters<typeof TripQuickAdd>[0]> = {}) {
  const onDayCreated = vi.fn();
  const onActivityCreated = vi.fn();
  render(
    <TripQuickAdd
      tripId={1}
      selectedDate={new Date(2026, 5, 7)}
      dayId={10}
      onDayCreated={onDayCreated}
      onActivityCreated={onActivityCreated}
      {...props}
    />,
  );
  return { onDayCreated, onActivityCreated };
}

describe("TripQuickAdd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  it("화면 하단에 떠 있는 추가 버튼을 그린다", () => {
    setup();
    expect(
      screen.getByRole("button", { name: "활동 추가" }),
    ).toBeInTheDocument();
  });

  it("버튼을 누르면 추가 폼(바텀시트)이 열린다", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "활동 추가" }));
    expect(screen.getByText("추가")).toBeInTheDocument();
    expect(screen.getByText("취소")).toBeInTheDocument();
  });

  it("Day 가 있으면 곧장 활동을 생성하고 콜백에 통지한다", async () => {
    const created = { id: 99, title: "New" };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => created });
    const { onActivityCreated, onDayCreated } = setup({ dayId: 10 });

    fireEvent.click(screen.getByRole("button", { name: "활동 추가" }));
    fireEvent.change(screen.getByLabelText(/제목/), {
      target: { value: "New" },
    });
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/trips/1/days/10/activities",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(onDayCreated).not.toHaveBeenCalled();
    expect(onActivityCreated).toHaveBeenCalledWith(10, created);
  });

  it("빈 날짜(dayId=null)면 Day 를 먼저 만든 뒤 활동을 생성한다", async () => {
    const day = { id: 42, date: "2026-06-07" };
    const created = { id: 100, title: "First" };
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => day })
      .mockResolvedValueOnce({ ok: true, json: async () => created });
    const { onDayCreated, onActivityCreated } = setup({ dayId: null });

    fireEvent.click(screen.getByRole("button", { name: "활동 추가" }));
    fireEvent.change(screen.getByLabelText(/제목/), {
      target: { value: "First" },
    });
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => expect(onActivityCreated).toHaveBeenCalled());
    // 첫 호출은 Day 생성, 둘째 호출은 활동 생성(새 Day id 로).
    expect(mockFetch.mock.calls[0][0]).toBe("/api/trips/1/days");
    expect(onDayCreated).toHaveBeenCalledWith({ id: 42, date: "2026-06-07" });
    expect(mockFetch.mock.calls[1][0]).toBe(
      "/api/trips/1/days/42/activities",
    );
    expect(onActivityCreated).toHaveBeenCalledWith(42, created);
  });

  it("저장 후에도 폼이 닫히지 않고 비워진다(연속 추가)", async () => {
    const created = { id: 60, title: "First" };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => created });
    setup({ dayId: 10 });

    fireEvent.click(screen.getByRole("button", { name: "활동 추가" }));
    fireEvent.change(screen.getByLabelText(/제목/), {
      target: { value: "First" },
    });
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledWith("일정을 추가했습니다"),
    );
    // 폼은 그대로 열려 있고(취소 버튼 존재), 제목 입력은 새 폼이라 비어 있다.
    expect(screen.getByText("취소")).toBeInTheDocument();
    expect((screen.getByLabelText(/제목/) as HTMLInputElement).value).toBe("");
  });

  it("활동 생성 실패 시 에러 토스트를 띄운다", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const { onActivityCreated } = setup({ dayId: 10 });

    fireEvent.click(screen.getByRole("button", { name: "활동 추가" }));
    fireEvent.change(screen.getByLabelText(/제목/), {
      target: { value: "Fail" },
    });
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith("활동 생성에 실패했습니다"),
    );
    expect(onActivityCreated).not.toHaveBeenCalled();
  });

  it("Day 생성 실패 시 활동 생성으로 진행하지 않는다", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const { onDayCreated, onActivityCreated } = setup({ dayId: null });

    fireEvent.click(screen.getByRole("button", { name: "활동 추가" }));
    fireEvent.change(screen.getByLabelText(/제목/), {
      target: { value: "X" },
    });
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith("일정 추가에 실패했습니다"),
    );
    expect(onDayCreated).not.toHaveBeenCalled();
    expect(onActivityCreated).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
