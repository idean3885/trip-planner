/**
 * spec 032 — 초기 선택 날짜 계산 (FR-002).
 *
 * 진입 시 여행 기간 안에 오늘이 있으면 오늘, 없으면 여행 첫날(일정 0건이면
 * 오늘)을 선택한다. today 의존이라 기간을 today 상대로 구성해 검증한다.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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

  // 여행 총액은 주안점이라 메인 동선(레이아웃)에 둔다.
  it("tripSummary 가 있으면 여행 총액을 보인다", () => {
    const today = new Date();
    render(
      <TripDetailLayout
        tripId={1}
        tripTitle="테스트 여행"
        isOwner={false}
        tripStart={today}
        tripEnd={addDays(today, 2)}
        days={[]}
        initialActivities={{}}
        canEdit={false}
        initialSelected={null}
        memberList={<div>멤버 목록</div>}
        syncCard={<div>동기화 카드</div>}
        tripSummary={[{ currency: "EUR", total: 120, advance: 80, onSite: 40 }]}
      />,
    );
    expect(screen.getByText("여행 총액")).toBeInTheDocument();
    expect(screen.getByText(/120 EUR/)).toBeInTheDocument();
  });

  it("tripSummary 가 비면 총액 줄을 렌더하지 않는다", () => {
    renderLayout();
    expect(screen.queryByText("여행 총액")).not.toBeInTheDocument();
  });
});

describe("TripDetailLayout 모바일 스와이프·스크롤 접힘 (v3.15.1 hotfix)", () => {
  function renderLayout() {
    const today = new Date();
    const addD = (n: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + n);
      return d;
    };
    return render(
      <TripDetailLayout
        tripId={1}
        tripTitle="테스트 여행"
        isOwner={false}
        tripStart={today}
        tripEnd={addD(2)}
        days={[]}
        initialActivities={{}}
        canEdit={false}
        initialSelected={null}
        memberList={<div>멤버 목록</div>}
        syncCard={<div>동기화 카드</div>}
      />,
    );
  }

  function setScrollY(y: number) {
    Object.defineProperty(window, "scrollY", {
      value: y,
      writable: true,
      configurable: true,
    });
  }

  // spec 058 — 클램프 가드는 문서가 뷰포트보다 길 때만 동작하므로, 스크롤 접힘
  // 테스트에서는 문서가 스크롤 가능(scrollHeight > innerHeight)하도록 둔다.
  function setDocScrollable(scrollable: boolean) {
    Object.defineProperty(window, "innerHeight", {
      value: 800,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: scrollable ? 2000 : 800,
      writable: true,
      configurable: true,
    });
  }

  afterEach(() => {
    setScrollY(0);
    setDocScrollable(true);
  });

  it("일정 캐러셀이 화면 절반(50svh)을 채워 빈 날에도 스크롤·스와이프 영역이 있다", () => {
    renderLayout();
    const carousel = screen.getByRole("group", { name: "선택 날짜 일정" });
    // spec 058 — 빈/적은 일정 날에도 스와이프·스크롤 영역을 두되, 100svh 처럼 한
    // 화면을 통째로 비우지 않는다. 접힘 플립은 onScroll 클램프 가드가 막는다.
    expect(carousel.className).toContain("min-h-[50svh]");
  });

  it("아래로 스크롤하면 모바일 캘린더가 주간으로 접히고, 최상단 복귀 시 펼친다", () => {
    setDocScrollable(true);
    renderLayout();
    // 초기(최상단) = 월간.
    expect(screen.getByRole("group", { name: "월 달력" })).toBeInTheDocument();
    // 아래로 스크롤 → 주간 접힘.
    setScrollY(200);
    fireEvent.scroll(window);
    expect(screen.getByRole("group", { name: "주 달력" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "월 달력" })).toBeNull();
    // 최상단 복귀 → 월간 펼침.
    setScrollY(0);
    fireEvent.scroll(window);
    expect(screen.getByRole("group", { name: "월 달력" })).toBeInTheDocument();
  });

  it("최상단에 닿기 전 위로 조금 스크롤해도 접힌 채 둔다(일관 동작)", () => {
    setDocScrollable(true);
    renderLayout();
    setScrollY(300);
    fireEvent.scroll(window);
    expect(screen.getByRole("group", { name: "주 달력" })).toBeInTheDocument();
    // 위로 조금(300→150) — 아직 최상단 아님 → 접힘 유지.
    setScrollY(150);
    fireEvent.scroll(window);
    expect(screen.getByRole("group", { name: "주 달력" })).toBeInTheDocument();
  });

  it("문서가 뷰포트보다 짧아 스크롤 불가하면 클램프된 scrollY 로 접힘 상태를 바꾸지 않는다", () => {
    setDocScrollable(true);
    renderLayout();
    // 먼저 스크롤로 접는다.
    setScrollY(300);
    fireEvent.scroll(window);
    expect(screen.getByRole("group", { name: "주 달력" })).toBeInTheDocument();
    // 콘텐츠가 짧아져 스크롤 불가가 되고 브라우저가 scrollY 를 0 으로 클램프해도
    // (spec 058 가드) 월간으로 다시 펼치지 않는다 — 튐·플립 방지.
    setDocScrollable(false);
    setScrollY(0);
    fireEvent.scroll(window);
    expect(screen.getByRole("group", { name: "주 달력" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "월 달력" })).toBeNull();
  });
});
