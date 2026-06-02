/**
 * spec 055 — 여행 캘린더 Figma 디자인 재색 검증.
 *
 * 월 그리드 루트에 `.trip-cal` 스코프 마커가 붙고, 여행기간 셀에 `.cal-range`
 * 마커가 부여되며(배경 채움 대신 텍스트 강조), 모바일 주간 스트립이 디자인 색
 * 체계(선택=연녹 배경, 여행주말=초록, 요일 라벨 일=초록·토=파랑)를 적용하는지 본다.
 */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CalendarView } from "@/components/trip/CalendarView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const TRIP_START = new Date(2026, 5, 7); // 06-07 일
const TRIP_END = new Date(2026, 5, 21); // 06-21 일
const SELECTED = new Date(2026, 5, 9); // 06-09 화(여행기간 평일)

describe("월 그리드 — 디자인 스코프·여행기간 마커", () => {
  it("캘린더 루트에 .trip-cal 스코프 마커가 붙는다", () => {
    const { container } = render(
      <CalendarView
        tripStart={TRIP_START}
        tripEnd={TRIP_END}
        daysDates={[SELECTED]}
        selected={SELECTED}
        onSelect={vi.fn()}
      />,
    );
    expect(container.querySelector(".trip-cal")).not.toBeNull();
  });

  it("여행기간 날짜 셀에 .cal-range 마커가 부여된다(배경 채움 클래스 아님)", () => {
    const { container } = render(
      <CalendarView
        tripStart={TRIP_START}
        tripEnd={TRIP_END}
        daysDates={[SELECTED]}
        selected={SELECTED}
        onSelect={vi.fn()}
      />,
    );
    expect(container.querySelector(".cal-range")).not.toBeNull();
    // 과거 bg-primary/10 채움 클래스는 더 이상 쓰지 않는다.
    expect(container.querySelector("[class*='bg-primary/10']")).toBeNull();
  });
});

describe("주간 스트립 — 디자인 색 체계", () => {
  function renderWeek() {
    const utils = render(
      <CalendarView
        tripStart={TRIP_START}
        tripEnd={TRIP_END}
        daysDates={[SELECTED]}
        selected={SELECTED}
        onSelect={vi.fn()}
        enableMobileCompact
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "주간만 보기" }));
    // off===0(현재 주) 스트립 = 선택 버튼(aria-pressed)이 있는 grid.
    const grids = screen.getAllByRole("grid", { name: "선택 주", hidden: true });
    const current = grids.find((g) =>
      within(g).queryByRole("button", { pressed: true }),
    );
    if (!current) throw new Error("현재 주 스트립을 찾지 못함");
    return { ...utils, current };
  }

  it("선택일 버튼이 연녹 선택 배경(bg-cal-selected-bg)을 쓴다", () => {
    const { current } = renderWeek();
    const selectedBtn = within(current).getByRole("button", { pressed: true });
    expect(selectedBtn.className).toContain("bg-cal-selected-bg");
    expect(selectedBtn.className).toContain("text-cal-selected-text");
  });

  it("요일 라벨이 일=초록·토=파랑·평일=그레이 토큰을 쓴다", () => {
    const { current } = renderWeek();
    const labels = within(current).getAllByText(
      /^(일|월|화|수|목|금|토)$/,
    );
    const sun = labels.find((el) => el.textContent === "일")!;
    const sat = labels.find((el) => el.textContent === "토")!;
    const mon = labels.find((el) => el.textContent === "월")!;
    expect(sun.className).toContain("text-cal-sunday");
    expect(sat.className).toContain("text-cal-saturday");
    expect(mon.className).toContain("text-cal-weekday-header");
  });

  it("여행기간 주말(일요일)은 여행주말 초록 텍스트를 쓴다", () => {
    const { current } = renderWeek();
    // 06-07 일요일 셀 버튼(여행기간 안 주말).
    const buttons = within(current).getAllByRole("button");
    const sundayCell = buttons.find((b) =>
      within(b).queryByText("7"),
    );
    expect(sundayCell?.className).toContain("text-cal-trip-weekend");
  });
});
