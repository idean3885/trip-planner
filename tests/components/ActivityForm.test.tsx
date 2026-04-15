import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ActivityForm from "@/components/ActivityForm";

describe("ActivityForm", () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all form fields", () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    expect(screen.getByText(/유형/)).toBeInTheDocument();
    expect(screen.getByText(/제목/)).toBeInTheDocument();
    expect(screen.getByText(/시작/)).toBeInTheDocument();
    expect(screen.getByText(/종료/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("장소")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("메모")).toBeInTheDocument();
    expect(screen.getByText("비용")).toBeInTheDocument();
    expect(screen.getByText("통화")).toBeInTheDocument();
    expect(screen.getByText("예약")).toBeInTheDocument();
  });

  it("shows required indicators", () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    const requiredMarks = screen.getAllByText("*");
    expect(requiredMarks.length).toBeGreaterThanOrEqual(4);
  });

  it("shows 추가 button in create mode", () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    expect(screen.getByText("추가")).toBeInTheDocument();
  });

  it("shows 수정 button in edit mode", () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} isEdit />);
    expect(screen.getByText("수정")).toBeInTheDocument();
  });

  it("calls onCancel when cancel clicked", () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("취소"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("populates initial values in edit mode", () => {
    render(
      <ActivityForm
        onSubmit={onSubmit}
        onCancel={onCancel}
        isEdit
        initial={{
          category: "DINING",
          title: "Lunch",
          startTime: "12:00",
          endTime: "13:00",
          location: "Restaurant",
          memo: "Good food",
          cost: "25",
          currency: "USD",
          reservationStatus: "RECOMMENDED",
        }}
      />
    );
    expect(screen.getByDisplayValue("Lunch")).toBeInTheDocument();
    expect(screen.getByDisplayValue("12:00")).toBeInTheDocument();
    expect(screen.getByDisplayValue("13:00")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Restaurant")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Good food")).toBeInTheDocument();
    expect(screen.getByDisplayValue("25")).toBeInTheDocument();
    expect(screen.getByDisplayValue("USD")).toBeInTheDocument();
  });

  it("submits form with filled data", async () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);

    const textInputs = screen.getAllByRole("textbox");
    // textInputs[0] = title, textInputs[1] = location, textInputs[2] = memo, textInputs[3] = currency
    fireEvent.change(textInputs[0], { target: { value: "Test Activity" } });
    fireEvent.change(textInputs[1], { target: { value: "Test Place" } });
    fireEvent.change(textInputs[2], { target: { value: "A memo" } });

    const form = document.querySelector("form")!;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
      const data = onSubmit.mock.calls[0][0];
      expect(data.title).toBe("Test Activity");
      expect(data.location).toBe("Test Place");
      expect(data.memo).toBe("A memo");
    });
  });

  it("does not submit when title is empty", async () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);

    // Title is empty by default, submit form
    const form = document.querySelector("form")!;
    fireEvent.submit(form);

    // onSubmit should NOT be called (title.trim() guard)
    await new Promise((r) => setTimeout(r, 50));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit when title is whitespace only", async () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);

    const textInputs = screen.getAllByRole("textbox");
    fireEvent.change(textInputs[0], { target: { value: "   " } });

    const form = document.querySelector("form")!;
    fireEvent.submit(form);

    await new Promise((r) => setTimeout(r, 50));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("auto-sets local time in create mode", async () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    await waitFor(() => {
      const timeInputs = screen.getAllByDisplayValue(/^\d{2}:\d{2}$/);
      expect(timeInputs.length).toBe(2); // start + end
    });
  });

  it("does not auto-set time in edit mode", async () => {
    render(
      <ActivityForm onSubmit={onSubmit} onCancel={onCancel} isEdit initial={{ startTime: "14:00", endTime: "15:00" }} />
    );
    expect(screen.getByDisplayValue("14:00")).toBeInTheDocument();
    expect(screen.getByDisplayValue("15:00")).toBeInTheDocument();
  });

  it("shows timezone label", async () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    await waitFor(() => {
      const labels = document.querySelectorAll("label");
      const startLabel = Array.from(labels).find((l) => l.textContent?.includes("시작"));
      expect(startLabel?.textContent).toMatch(/\(.+\)/);
    });
  });

  it("updates category via select", () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "DINING" } });
    expect(screen.getByDisplayValue("식사")).toBeInTheDocument();
  });

  it("updates reservation status via select", () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    const selects = screen.getAllByRole("combobox");
    // Last select is reservation status
    fireEvent.change(selects[selects.length - 1], { target: { value: "REQUIRED" } });
    expect(screen.getByDisplayValue("사전 예약 필수")).toBeInTheDocument();
  });

  it("updates cost field", () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    const costInput = screen.getByRole("spinbutton");
    fireEvent.change(costInput, { target: { value: "42.5" } });
    expect(screen.getByDisplayValue("42.5")).toBeInTheDocument();
  });

  it("uppercases currency input", () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    const textInputs = screen.getAllByRole("textbox");
    // currency is textInputs[3]
    fireEvent.change(textInputs[3], { target: { value: "usd" } });
    expect(screen.getByDisplayValue("USD")).toBeInTheDocument();
  });

  it("updates time fields", () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} isEdit initial={{ startTime: "", endTime: "" }} />);
    const timeInputs = document.querySelectorAll('input[type="time"]');
    fireEvent.change(timeInputs[0], { target: { value: "10:30" } });
    fireEvent.change(timeInputs[1], { target: { value: "12:00" } });
    expect(screen.getByDisplayValue("10:30")).toBeInTheDocument();
    expect(screen.getByDisplayValue("12:00")).toBeInTheDocument();
  });

  it("auto-sets time with minutes < 30 (rounds to :30)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 7, 14, 15)); // 14:15 → start 14:30, end 15:30
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    vi.useRealTimers();

    await waitFor(() => {
      expect(screen.getByDisplayValue("14:30")).toBeInTheDocument();
      expect(screen.getByDisplayValue("15:30")).toBeInTheDocument();
    });
  });

  it("auto-sets time with minutes >= 30 (rounds to next hour)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 7, 14, 45)); // 14:45 → start 15:00, end 16:00
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    vi.useRealTimers();

    await waitFor(() => {
      expect(screen.getByDisplayValue("15:00")).toBeInTheDocument();
      expect(screen.getByDisplayValue("16:00")).toBeInTheDocument();
    });
  });

  it("skips auto-set when initial startTime provided", async () => {
    render(
      <ActivityForm onSubmit={onSubmit} onCancel={onCancel} initial={{ startTime: "08:00", endTime: "09:00" }} />
    );
    expect(screen.getByDisplayValue("08:00")).toBeInTheDocument();
    expect(screen.getByDisplayValue("09:00")).toBeInTheDocument();
  });

  it("shows saving state during submit", async () => {
    let resolveSubmit: () => void;
    const slowSubmit = vi.fn(() => new Promise<void>((r) => { resolveSubmit = r; }));

    render(<ActivityForm onSubmit={slowSubmit} onCancel={onCancel} />);
    const textInputs = screen.getAllByRole("textbox");
    fireEvent.change(textInputs[0], { target: { value: "Saving" } });

    const form = document.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("저장 중...")).toBeInTheDocument();
    });

    resolveSubmit!();
    await waitFor(() => {
      expect(screen.getByText("추가")).toBeInTheDocument();
    });
  });
});
