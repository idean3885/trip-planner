/**
 * spec 032 — 모바일 월↔주 압축의 주 계산 + 압축 캘린더 기본 렌더.
 *
 * getWeekDays 는 선택 날짜가 속한 주(일요일 시작)의 7일을 반환한다. 압축
 * 캘린더는 enableMobileCompact 일 때 기본 월 표시(data-calendar-view="month")
 * 로 시작한다(위로 스와이프 전).
 */
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { CalendarView, getWeekDays } from "@/components/trip/CalendarView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("getWeekDays", () => {
  it("선택 날짜가 속한 주의 7일을 일요일 시작으로 반환한다", () => {
    // 2026-06-09 은 화요일. 그 주 일요일 = 06-07, 토요일 = 06-13.
    const week = getWeekDays(new Date(2026, 5, 9));
    expect(week).toHaveLength(7);
    expect(week[0].getDay()).toBe(0); // 일요일
    expect(week[0].getDate()).toBe(7);
    expect(week[6].getDate()).toBe(13);
  });

  it("일요일 입력은 그 날을 주의 첫날로 둔다", () => {
    const week = getWeekDays(new Date(2026, 5, 7)); // 06-07 일
    expect(week[0].getDate()).toBe(7);
  });
});

describe("CalendarView 모바일 압축", () => {
  it("enableMobileCompact 는 기본 월 표시로 시작한다", () => {
    const { container } = render(
      <CalendarView
        tripStart={new Date(2026, 5, 7)}
        tripEnd={new Date(2026, 5, 21)}
        daysDates={[new Date(2026, 5, 9)]}
        selected={new Date(2026, 5, 9)}
        onSelect={vi.fn()}
        enableMobileCompact
      />,
    );
    expect(
      container.querySelector('[data-calendar-view="month"]'),
    ).not.toBeNull();
  });

  it("명시적 탭 토글로 월↔주를 전환한다(#637 — 스와이프 대체 경로)", () => {
    const { container } = render(
      <CalendarView
        tripStart={new Date(2026, 5, 7)}
        tripEnd={new Date(2026, 5, 21)}
        daysDates={[new Date(2026, 5, 9)]}
        selected={new Date(2026, 5, 9)}
        onSelect={vi.fn()}
        enableMobileCompact
      />,
    );
    // 월 표시에서 "주간만 보기" 탭 → 주 표시.
    fireEvent.click(screen.getByRole("button", { name: "주간만 보기" }));
    expect(
      container.querySelector('[data-calendar-view="week"]'),
    ).not.toBeNull();
    // 주 표시에서 "월 전체 보기" 탭 → 월 표시 복귀.
    fireEvent.click(screen.getByRole("button", { name: "월 전체 보기" }));
    expect(
      container.querySelector('[data-calendar-view="month"]'),
    ).not.toBeNull();
  });

  it("세로 스와이프용 touch-action 제약을 두지 않는다 — 캘린더 영역 정상 스크롤(#649)", () => {
    // touch-action: pan-x 가 sticky 캘린더 위에서 페이지 세로 스크롤을 막던
    // 치명적 회귀(#649)를 제거했다. 컨테이너에 touch-pan-x 클래스가 없어야 한다.
    const { container } = render(
      <CalendarView
        tripStart={new Date(2026, 5, 7)}
        tripEnd={new Date(2026, 5, 21)}
        daysDates={[new Date(2026, 5, 9)]}
        selected={new Date(2026, 5, 9)}
        onSelect={vi.fn()}
        enableMobileCompact
      />,
    );
    const area = container.querySelector("[data-calendar-view]");
    expect(area).not.toBeNull();
    expect(area?.className ?? "").not.toMatch(/touch-pan-x/);
  });

  it("스와이프 컨테이너는 touch-pan-y 로 세로 스크롤을 보존한다(#653/#649)", () => {
    const { container } = render(
      <CalendarView
        tripStart={new Date(2026, 5, 7)}
        tripEnd={new Date(2026, 5, 21)}
        daysDates={[new Date(2026, 5, 9)]}
        selected={new Date(2026, 5, 9)}
        onSelect={vi.fn()}
        enableMobileCompact
      />,
    );
    expect(
      container.querySelector("[data-calendar-view]")?.className,
    ).toMatch(/touch-pan-y/);
  });

  it("주 뷰에서 좌우 스와이프로 ±7일(주 단위) 이동한다(#653)", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <CalendarView
        tripStart={new Date(2026, 5, 7)}
        tripEnd={new Date(2026, 5, 21)}
        daysDates={[new Date(2026, 5, 9)]}
        selected={new Date(2026, 5, 9)}
        onSelect={onSelect}
        enableMobileCompact
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "주간만 보기" }));
    const area = container.querySelector('[data-calendar-view="week"]')!;
    // 왼쪽으로 쓸기(dx -100) → 다음 주(06-09 +7 = 06-16).
    fireEvent.touchStart(area, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchEnd(area, { changedTouches: [{ clientX: 100, clientY: 100 }] });
    const last = onSelect.mock.calls.at(-1)?.[0] as Date;
    expect(last.getDate()).toBe(16);
    // 오른쪽으로 쓸기(dx +100) → 이전 주(06-09 −7 = 06-02).
    fireEvent.touchStart(area, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchEnd(area, { changedTouches: [{ clientX: 200, clientY: 100 }] });
    const prev = onSelect.mock.calls.at(-1)?.[0] as Date;
    expect(prev.getDate()).toBe(2);
  });

  it("월 뷰에서 좌우 스와이프로 표시 달을 이동한다(#653)", () => {
    const { container } = render(
      <CalendarView
        tripStart={new Date(2026, 5, 7)}
        tripEnd={new Date(2026, 5, 21)}
        daysDates={[new Date(2026, 5, 9)]}
        selected={new Date(2026, 5, 9)}
        onSelect={vi.fn()}
        enableMobileCompact
      />,
    );
    const area = container.querySelector('[data-calendar-view="month"]')!;
    // 왼쪽으로 쓸기 → 다음 달(7월) 캡션 노출.
    fireEvent.touchStart(area, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchEnd(area, { changedTouches: [{ clientX: 100, clientY: 100 }] });
    expect(container.textContent).toMatch(/7월/);
  });
});
