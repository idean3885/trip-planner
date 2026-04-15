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
    expect(requiredMarks.length).toBeGreaterThanOrEqual(4); // 유형, 제목, 시작, 종료
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
        }}
      />
    );
    expect(screen.getByDisplayValue("Lunch")).toBeInTheDocument();
    expect(screen.getByDisplayValue("12:00")).toBeInTheDocument();
    expect(screen.getByDisplayValue("13:00")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Restaurant")).toBeInTheDocument();
  });

  it("submits form data", async () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);

    // Fill title (first text input after category select)
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "Test Activity" } });

    const form = document.querySelector("form")!;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  it("auto-sets local time in create mode", async () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    // useEffect sets time after mount
    await waitFor(() => {
      const timeInputs = screen.getAllByDisplayValue(/^\d{2}:\d{2}$/);
      expect(timeInputs.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows timezone label", async () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    await waitFor(() => {
      // Should show city name from timezone
      const labels = document.querySelectorAll("label");
      const startLabel = Array.from(labels).find((l) => l.textContent?.includes("시작"));
      expect(startLabel?.textContent).toMatch(/\(.+\)/);
    });
  });
});
