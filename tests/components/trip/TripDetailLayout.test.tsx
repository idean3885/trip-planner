/**
 * spec 032 — 초기 선택 날짜 계산 (FR-002).
 *
 * 진입 시 여행 기간 안에 오늘이 있으면 오늘, 없으면 여행 첫날(일정 0건이면
 * 오늘)을 선택한다. today 의존이라 기간을 today 상대로 구성해 검증한다.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  computeInitialSelected,
  TripDetailLayout,
} from "@/components/trip/TripDetailLayout";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
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

describe("TripDetailLayout 상단·액션바 (spec 043)", () => {
  function renderLayout(overrides?: { initialSelected?: string | null }) {
    const today = new Date();
    return render(
      <TripDetailLayout
        tripId={1}
        tripTitle="테스트 여행"
        isOwner={false}
        tripStart={today}
        tripEnd={addDays(today, 2)}
        days={[]}
        initialActivities={{}}
        canEdit={false}
        initialSelected={overrides?.initialSelected ?? null}
        memberList={<div>멤버 목록</div>}
        syncCard={<div>동기화 카드</div>}
      />,
    );
  }

  it("동기화 진입 노드를 액션바에 한 번 렌더한다 (spec 043 US3 — 단일 진입)", () => {
    renderLayout();
    // 액션바는 데스크탑·모바일 공통 1개라 syncCard 도 1회만 DOM 에 있다.
    expect(screen.getAllByText("동기화 카드")).toHaveLength(1);
  });

  it("선택 날짜 일정 캐러셀이 렌더된다", () => {
    renderLayout();
    expect(
      screen.getByRole("group", { name: "선택 날짜 일정" }),
    ).toBeInTheDocument();
  });

  it("일정 캐러셀은 touch-pan-y 로 세로 스크롤을 컨테이너에 위임한다", () => {
    renderLayout();
    const carousel = screen.getByRole("group", { name: "선택 날짜 일정" });
    expect(carousel.className).toContain("touch-pan-y");
  });

  it("데스크탑 2분할 레이아웃이 함께 렌더된다", () => {
    const { container } = renderLayout();
    expect(container.querySelector(".lg\\:grid")).not.toBeNull();
  });

  it("선택 일자를 쿼리(?d=)에 반영한다 (spec 043 US5)", () => {
    const today = new Date();
    renderLayout();
    const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(new URL(window.location.href).searchParams.get("d")).toBe(ymd);
  });
});
