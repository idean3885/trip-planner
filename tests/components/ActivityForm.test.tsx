import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ActivityForm from "@/components/ActivityForm";

// spec 061 — 지출 중심 폼: 생성은 제목·가격·내용 간소 + 확장, 편집은 전체.
// 예약상태 제거, 시간 선택(비강제), 지출 시점(사전/현장) 토글.

describe("ActivityForm", () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("생성 간소 모드: 제목·가격·내용 + 확장 버튼만 노출", () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    expect(screen.getByLabelText(/제목/)).toBeInTheDocument();
    expect(screen.getByLabelText("가격")).toBeInTheDocument();
    expect(screen.getByLabelText("내용")).toBeInTheDocument();
    // 확장 전에는 유형·지출시점·장소·링크가 없다.
    expect(screen.queryByLabelText("유형")).toBeNull();
    expect(screen.queryByLabelText("지출 시점")).toBeNull();
    expect(screen.queryByLabelText("장소")).toBeNull();
    expect(screen.getByText(/확장/)).toBeInTheDocument();
    // 예약 입력은 어디에도 없다.
    expect(screen.queryByText("예약")).toBeNull();
  });

  it("확장하면 유형·지출시점·시간·장소·링크가 나타난다", () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    fireEvent.click(screen.getByText(/확장/));
    expect(screen.getByLabelText("유형")).toBeInTheDocument();
    expect(screen.getByLabelText("지출 시점")).toBeInTheDocument();
    expect(screen.getByLabelText("장소")).toBeInTheDocument();
    expect(screen.getByLabelText("링크")).toBeInTheDocument();
    expect(screen.getByLabelText(/시작/)).toBeInTheDocument();
  });

  it("편집 모드는 전체 필드로 시작한다(확장 상태)", () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} isEdit />);
    expect(screen.getByLabelText("유형")).toBeInTheDocument();
    expect(screen.getByLabelText("지출 시점")).toBeInTheDocument();
    expect(screen.getByText("수정")).toBeInTheDocument();
  });

  it("생성 모드는 '추가' 버튼", () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    expect(screen.getByText("추가")).toBeInTheDocument();
  });

  it("취소 클릭 시 onCancel", () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("취소"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("편집 모드 초기값을 채운다", () => {
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
          paymentTiming: "ADVANCE",
        }}
      />,
    );
    expect(screen.getByDisplayValue("Lunch")).toBeInTheDocument();
    expect(screen.getByDisplayValue("12:00")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Restaurant")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Good food")).toBeInTheDocument();
    expect(screen.getByDisplayValue("25")).toBeInTheDocument();
    expect(screen.getByDisplayValue("USD")).toBeInTheDocument();
    expect(
      (screen.getByLabelText("지출 시점") as HTMLSelectElement).value,
    ).toBe("ADVANCE");
  });

  it("간소 모드: 제목·가격·내용만으로 제출(시간 입력 없이)", async () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    fireEvent.change(screen.getByLabelText(/제목/), {
      target: { value: "맥주" },
    });
    fireEvent.change(screen.getByLabelText("가격"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("내용"), {
      target: { value: "길거리 맥주" },
    });
    fireEvent.click(screen.getByText("추가"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    const data = onSubmit.mock.calls[0][0];
    expect(data.title).toBe("맥주");
    expect(data.cost).toBe("5");
    expect(data.memo).toBe("길거리 맥주");
    expect(data.startTime).toBe(""); // 시간 비강제
  });

  it("제목이 비면 제출하지 않는다", async () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    const form = document.querySelector("form")!;
    fireEvent.submit(form);
    await new Promise((r) => setTimeout(r, 30));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("제목이 공백뿐이면 제출하지 않는다", async () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    fireEvent.change(screen.getByLabelText(/제목/), { target: { value: "   " } });
    const form = document.querySelector("form")!;
    fireEvent.submit(form);
    await new Promise((r) => setTimeout(r, 30));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("생성 시 시간을 자동 주입하지 않는다(시간 선택)", () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    fireEvent.click(screen.getByText(/확장/));
    const start = screen.getByLabelText(/시작/) as HTMLInputElement;
    const end = screen.getByLabelText(/종료/) as HTMLInputElement;
    expect(start.value).toBe("");
    expect(end.value).toBe("");
  });

  it("지출 시점 디폴트를 timingDefault 로 잡는다(여행전=사전)", () => {
    render(
      <ActivityForm
        onSubmit={onSubmit}
        onCancel={onCancel}
        timingDefault="ADVANCE"
      />,
    );
    fireEvent.click(screen.getByText(/확장/));
    expect(
      (screen.getByLabelText("지출 시점") as HTMLSelectElement).value,
    ).toBe("ADVANCE");
  });

  it("지출 시점 디폴트 현장(여행중)", () => {
    render(
      <ActivityForm
        onSubmit={onSubmit}
        onCancel={onCancel}
        timingDefault="ON_SITE"
      />,
    );
    fireEvent.click(screen.getByText(/확장/));
    expect(
      (screen.getByLabelText("지출 시점") as HTMLSelectElement).value,
    ).toBe("ON_SITE");
  });

  it("유형 select 변경", () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} isEdit />);
    fireEvent.change(screen.getByLabelText("유형"), {
      target: { value: "DINING" },
    });
    expect(screen.getByDisplayValue("식사")).toBeInTheDocument();
  });

  it("가격(cost) 변경", () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    fireEvent.change(screen.getByLabelText("가격"), {
      target: { value: "42.5" },
    });
    expect(screen.getByDisplayValue("42.5")).toBeInTheDocument();
  });

  it("통화 입력은 대문자화", () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    fireEvent.change(screen.getByLabelText("통화"), { target: { value: "usd" } });
    expect(screen.getByDisplayValue("USD")).toBeInTheDocument();
  });

  it("시간 입력 변경(확장)", () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} isEdit />);
    const timeInputs = document.querySelectorAll('input[type="time"]');
    fireEvent.change(timeInputs[0], { target: { value: "10:30" } });
    fireEvent.change(timeInputs[1], { target: { value: "12:00" } });
    expect(screen.getByDisplayValue("10:30")).toBeInTheDocument();
    expect(screen.getByDisplayValue("12:00")).toBeInTheDocument();
  });

  it("종일 토글 시 시간 입력을 감춘다", () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} isEdit />);
    expect(screen.getByLabelText(/시작/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/종일/));
    expect(screen.queryByLabelText(/시작/)).toBeNull();
  });

  it("저장 중 상태 표시", async () => {
    let resolveSubmit: () => void;
    const slowSubmit = vi.fn(
      () => new Promise<void>((r) => (resolveSubmit = r)),
    );
    render(<ActivityForm onSubmit={slowSubmit} onCancel={onCancel} />);
    fireEvent.change(screen.getByLabelText(/제목/), {
      target: { value: "Saving" },
    });
    fireEvent.click(screen.getByText("추가"));
    await waitFor(() =>
      expect(screen.getByText("저장 중...")).toBeInTheDocument(),
    );
    resolveSubmit!();
    await waitFor(() => expect(screen.getByText("추가")).toBeInTheDocument());
  });

  it("url 을 함께 제출한다(확장)", async () => {
    render(<ActivityForm onSubmit={onSubmit} onCancel={onCancel} />);
    fireEvent.change(screen.getByLabelText(/제목/), {
      target: { value: "기차" },
    });
    fireEvent.click(screen.getByText(/확장/));
    fireEvent.change(screen.getByLabelText("링크"), {
      target: { value: "https://example.com/ticket" },
    });
    fireEvent.click(screen.getByText("추가"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      url: "https://example.com/ticket",
    });
  });

  // ── readOnly 상세(보기) ──
  it("readOnly 상세: 입력칸 없이 값만 + 지출 라벨 + 편집/닫기 (#796)", () => {
    const onEdit = vi.fn();
    render(
      <ActivityForm
        onCancel={onCancel}
        readOnly
        onEdit={onEdit}
        initial={{
          title: "구엘",
          memo: "https://example.com 참고",
          paymentTiming: "ADVANCE",
        }}
      />,
    );
    expect(screen.getByText("구엘")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByText("사전 결제")).toBeInTheDocument(); // 지출 라벨
    expect(screen.getByRole("link")).toBeInTheDocument();
    fireEvent.click(screen.getByText("편집"));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("readOnly 상세: 메모 없으면 '메모 없음'", () => {
    render(
      <ActivityForm
        onCancel={onCancel}
        readOnly
        initial={{ title: "X", memo: "" }}
      />,
    );
    expect(screen.getByText("메모 없음")).toBeInTheDocument();
  });

  it("readOnly 상세: onEdit 없으면 편집 버튼 미노출", () => {
    render(
      <ActivityForm onCancel={onCancel} readOnly initial={{ title: "X" }} />,
    );
    expect(screen.queryByText("편집")).toBeNull();
    expect(screen.getByText("닫기")).toBeInTheDocument();
  });

  it("readOnly 상세: url 이 있으면 링크로 보인다", () => {
    render(
      <ActivityForm
        onCancel={onCancel}
        readOnly
        initial={{ title: "X", url: "https://example.com/booking" }}
      />,
    );
    const link = screen.getByRole("link", {
      name: "https://example.com/booking",
    });
    expect(link).toHaveAttribute("href", "https://example.com/booking");
  });

  // spec 058 — 시작/종료 좁은 폭 1열, ≥360px 2열 (확장 시)
  it("시작/종료는 좁은 폭 1열, ≥360px 2열", () => {
    const { container } = render(
      <ActivityForm onSubmit={onSubmit} onCancel={onCancel} isEdit />,
    );
    const startInput = container.querySelector("#activity-start");
    const grid = startInput?.closest("div.grid");
    expect(grid?.className).toMatch(/grid-cols-1/);
    expect(grid?.className).toMatch(/min-\[360px\]:grid-cols-2/);
  });
});
