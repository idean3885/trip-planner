import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TripCheckboxes } from "@/components/trip/TripCheckboxes";

describe("TripCheckboxes", () => {
  const trips = [
    { id: 1, title: "신혼여행" },
    { id: 2, title: "동창회" },
    { id: 3, title: "출장" },
  ];

  it("trips 가 비어 있으면 null (DOM 미렌더)", () => {
    const { container } = render(
      <TripCheckboxes
        trips={[]}
        checkedTripIds={new Set()}
        onToggle={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("각 trip 의 제목과 체크박스가 노출", () => {
    render(
      <TripCheckboxes
        trips={trips}
        checkedTripIds={new Set([1])}
        onToggle={() => {}}
      />,
    );
    expect(screen.getByText("신혼여행")).toBeInTheDocument();
    expect(screen.getByText("동창회")).toBeInTheDocument();
    expect(screen.getByText("출장")).toBeInTheDocument();
  });

  it("checkedTripIds 에 든 trip 만 체크 상태", () => {
    render(
      <TripCheckboxes
        trips={trips}
        checkedTripIds={new Set([1, 3])}
        onToggle={() => {}}
      />,
    );
    const cb1 = screen.getByLabelText("신혼여행 캘린더에 표시") as HTMLInputElement;
    const cb2 = screen.getByLabelText("동창회 캘린더에 표시") as HTMLInputElement;
    const cb3 = screen.getByLabelText("출장 캘린더에 표시") as HTMLInputElement;
    expect(cb1.checked).toBe(true);
    expect(cb2.checked).toBe(false);
    expect(cb3.checked).toBe(true);
  });

  it("체크박스 변경 시 onToggle 이 (tripId, checked) 인자로 호출", () => {
    const onToggle = vi.fn();
    render(
      <TripCheckboxes
        trips={trips}
        checkedTripIds={new Set([1])}
        onToggle={onToggle}
      />,
    );
    const cb2 = screen.getByLabelText("동창회 캘린더에 표시");
    fireEvent.click(cb2);
    expect(onToggle).toHaveBeenCalledWith(2, true);

    const cb1 = screen.getByLabelText("신혼여행 캘린더에 표시");
    fireEvent.click(cb1);
    expect(onToggle).toHaveBeenLastCalledWith(1, false);
  });
});
