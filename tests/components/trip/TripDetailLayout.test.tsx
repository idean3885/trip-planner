/**
 * spec 032 — 초기 선택 날짜 계산 (FR-002).
 *
 * 진입 시 여행 기간 안에 오늘이 있으면 오늘, 없으면 여행 첫날(일정 0건이면
 * 오늘)을 선택한다. today 의존이라 기간을 today 상대로 구성해 검증한다.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  TripDetailLayout,
  computeInitialSelected,
} from "@/components/trip/TripDetailLayout";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast: mockToast }));
global.fetch = vi.fn();

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

describe("computeInitialSelected", () => {
  it("오늘이 여행 기간 안이면 오늘을 선택한다", () => {
    const today = new Date();
    const start = addDays(today, -3);
    const end = addDays(today, 3);
    const result = computeInitialSelected(start, end);
    expect(result.toDateString()).toBe(today.toDateString());
  });

  it("오늘이 여행 기간 밖이면 여행 첫날을 선택한다", () => {
    const today = new Date();
    const start = addDays(today, 10);
    const end = addDays(today, 20);
    const result = computeInitialSelected(start, end);
    expect(result.toDateString()).toBe(start.toDateString());
  });

  it("일정 0건(기간 null)이면 오늘을 선택한다", () => {
    const today = new Date();
    const result = computeInitialSelected(null, null);
    expect(result.toDateString()).toBe(today.toDateString());
  });
});

describe("TripDetailLayout 모바일 상단 (#684)", () => {
  function renderLayout() {
    const today = new Date();
    return render(
      <TripDetailLayout
        tripId={1}
        tripStart={today}
        tripEnd={addDays(today, 2)}
        days={[]}
        initialActivities={{}}
        canEdit={false}
        syncCard={<div>동기화 카드</div>}
        memberList={<div>동행자 목록</div>}
      />,
    );
  }

  it("'자세히' 버튼은 Ellipsis 아이콘 없이 텍스트만 렌더한다", () => {
    renderLayout();
    const btn = screen.getByRole("button", { name: "자세히" });
    expect(btn).toBeInTheDocument();
    // Ellipsis(svg) 제거 — 버튼 안에 아이콘 노드가 없다.
    expect(btn.querySelector("svg")).toBeNull();
  });

  it("'자세히' 클릭 시 여행 정보 Dialog 를 연다", async () => {
    renderLayout();
    fireEvent.click(screen.getByRole("button", { name: "자세히" }));
    expect(await screen.findByText("여행 정보")).toBeInTheDocument();
  });
});
