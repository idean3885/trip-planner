import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ActivityCard from "@/components/ActivityCard";
import type { ActivityCategory, ReservationStatus } from "@prisma/client";

function makeActivity(overrides = {}) {
  return {
    id: 1,
    category: "SIGHTSEEING" as ActivityCategory,
    title: "벨렝 탑 방문",
    startTime: "2026-06-07T09:00:00.000Z",
    endTime: "2026-06-07T11:00:00.000Z",
    location: "Torre de Belém",
    memo: null,
    cost: null,
    currency: "EUR",
    reservationStatus: null as ReservationStatus | null,
    ...overrides,
  };
}

describe("ActivityCard", () => {
  it("renders category, title, time, location", () => {
    render(<ActivityCard activity={makeActivity()} />);
    expect(screen.getByText("관광")).toBeInTheDocument();
    expect(screen.getByText("벨렝 탑 방문")).toBeInTheDocument();
    expect(screen.getByText("09:00–11:00")).toBeInTheDocument();
    expect(screen.getByText("Torre de Belém")).toBeInTheDocument();
  });

  it("renders startTime only when no endTime", () => {
    render(<ActivityCard activity={makeActivity({ endTime: null })} />);
    expect(screen.getByText("09:00")).toBeInTheDocument();
  });

  it("renders legacy HH:mm value verbatim (no T, no ISO conversion)", () => {
    render(
      <ActivityCard
        activity={makeActivity({ startTime: "08:30", endTime: "09:45" })}
      />
    );
    // legacy 값은 변환 없이 그대로 표시 (ISO가 아닌 옛 데이터 방어 경로)
    expect(screen.getByText("08:30–09:45")).toBeInTheDocument();
  });

  it("falls back for IANA outside whitelist (Etc/GMT → GMT via Intl)", () => {
    // 화이트리스트에 없고 Intl이 GMT를 돌려줄 경우 최종 폴백(마지막 세그먼트) 사용.
    render(
      <ActivityCard
        activity={makeActivity({
          startTime: "2026-06-07T04:00:00.000Z",
          endTime: null,
          startTimezone: "Etc/GMT",
        })}
      />
    );
    expect(screen.getByText(/04:00 GMT/)).toBeInTheDocument();
  });

  it("renders cost and currency", () => {
    render(<ActivityCard activity={makeActivity({ cost: 15, currency: "EUR" })} />);
    expect(screen.getByText("15 EUR")).toBeInTheDocument();
  });

  it("renders reservation status", () => {
    render(<ActivityCard activity={makeActivity({ reservationStatus: "REQUIRED" })} />);
    expect(screen.getByText("사전 예약 필수")).toBeInTheDocument();
  });

  it("renders memo with URL as link", () => {
    render(
      <ActivityCard activity={makeActivity({ memo: "예약 https://example.com 필수" })} />
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders memo without URL as plain text", () => {
    render(<ActivityCard activity={makeActivity({ memo: "메모입니다" })} />);
    expect(screen.getByText("메모입니다")).toBeInTheDocument();
  });

  it("hides edit/delete buttons when canEdit is false", () => {
    render(<ActivityCard activity={makeActivity()} canEdit={false} />);
    expect(screen.queryByText("편집")).not.toBeInTheDocument();
    expect(screen.queryByText("삭제")).not.toBeInTheDocument();
  });

  it("shows edit/delete/reorder buttons when canEdit", () => {
    render(
      <ActivityCard
        activity={makeActivity()}
        canEdit
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      />
    );
    expect(screen.getByText("편집")).toBeInTheDocument();
    expect(screen.getByText("삭제")).toBeInTheDocument();
    expect(screen.getByLabelText("위로")).toBeInTheDocument();
    expect(screen.getByLabelText("아래로")).toBeInTheDocument();
  });

  it("disables move up when isFirst", () => {
    render(
      <ActivityCard activity={makeActivity()} canEdit isFirst onMoveUp={vi.fn()} onMoveDown={vi.fn()} />
    );
    expect(screen.getByLabelText("위로")).toBeDisabled();
    expect(screen.getByLabelText("아래로")).not.toBeDisabled();
  });

  it("disables move down when isLast", () => {
    render(
      <ActivityCard activity={makeActivity()} canEdit isLast onMoveUp={vi.fn()} onMoveDown={vi.fn()} />
    );
    expect(screen.getByLabelText("위로")).not.toBeDisabled();
    expect(screen.getByLabelText("아래로")).toBeDisabled();
  });

  it("calls onEdit when edit button clicked", () => {
    const onEdit = vi.fn();
    render(<ActivityCard activity={makeActivity()} canEdit onEdit={onEdit} />);
    fireEvent.click(screen.getByText("편집"));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("calls onDelete when delete button clicked", () => {
    const onDelete = vi.fn();
    render(<ActivityCard activity={makeActivity()} canEdit onDelete={onDelete} />);
    fireEvent.click(screen.getByText("삭제"));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("renders null when no startTime and no endTime", () => {
    render(<ActivityCard activity={makeActivity({ startTime: null, endTime: null })} />);
    // No time range should be displayed
    expect(screen.queryByText(/\d{2}:\d{2}/)).not.toBeInTheDocument();
  });

  it("renders time in Asia/Seoul as KST (#232 #325)", () => {
    // 04:00 UTC → Asia/Seoul 13:00 KST
    render(
      <ActivityCard
        activity={makeActivity({
          startTime: "2026-06-07T04:00:00.000Z",
          endTime: "2026-06-07T06:00:00.000Z",
          startTimezone: "Asia/Seoul",
          endTimezone: "Asia/Seoul",
        })}
      />
    );
    expect(screen.getByText("13:00 KST–15:00 KST")).toBeInTheDocument();
  });

  it("renders Europe/Lisbon DST as WEST (#325)", () => {
    // 19:15 UTC + Europe/Lisbon 여름 = 20:15 WEST
    render(
      <ActivityCard
        activity={makeActivity({
          startTime: "2026-06-07T19:15:00.000Z",
          endTime: null,
          startTimezone: "Europe/Lisbon",
        })}
      />
    );
    expect(screen.getByText("20:15 WEST")).toBeInTheDocument();
  });

  it("renders Europe/Lisbon winter as WET (#325)", () => {
    // 1월은 표준시 (WET)
    render(
      <ActivityCard
        activity={makeActivity({
          startTime: "2026-01-15T12:00:00.000Z",
          endTime: null,
          startTimezone: "Europe/Lisbon",
        })}
      />
    );
    expect(screen.getByText("12:00 WET")).toBeInTheDocument();
  });

  it("renders all category types", () => {
    const categories: ActivityCategory[] = [
      "SIGHTSEEING", "DINING", "TRANSPORT", "ACCOMMODATION", "SHOPPING", "OTHER",
    ];
    const labels = ["관광", "식사", "이동", "숙소", "쇼핑", "기타"];
    categories.forEach((cat, i) => {
      const { unmount } = render(<ActivityCard activity={makeActivity({ category: cat })} />);
      expect(screen.getByText(labels[i])).toBeInTheDocument();
      unmount();
    });
  });
});
