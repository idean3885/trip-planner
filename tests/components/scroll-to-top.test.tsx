/**
 * #894 — 상단 이동 플로팅을 스크롤 중 상시 표시로. 이전에는 2초 무동작 후
 * opacity-0 + pointer-events-none로 사라져 "위로 이동" 용도로 쓰기 어려웠다.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import ScrollToTop from "@/components/ScrollToTop";

function setScrollY(y: number) {
  Object.defineProperty(window, "scrollY", {
    value: y,
    configurable: true,
    writable: true,
  });
}

afterEach(() => setScrollY(0));

describe("ScrollToTop (#894)", () => {
  it("300px 이하에서는 표시되지 않는다", () => {
    setScrollY(0);
    render(<ScrollToTop />);
    expect(screen.queryByRole("button", { name: "맨 위로 스크롤" })).toBeNull();
  });

  it("300px 초과 스크롤 시 노출되고 클릭 가능(불투명)하다", () => {
    render(<ScrollToTop />);
    act(() => {
      setScrollY(600);
      fireEvent.scroll(window);
    });
    const btn = screen.getByRole("button", { name: "맨 위로 스크롤" });
    expect(btn).toBeInTheDocument();
    // 2초 페이드 제거 — 사라지게 하는 클래스가 없어야 한다
    expect(btn.className).not.toContain("opacity-0");
    expect(btn.className).not.toContain("pointer-events-none");
  });
});
