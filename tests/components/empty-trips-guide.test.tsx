/**
 * #903 — 빈 여행 목록 빠른 시작. 두 경로(직접 만들기 / AI에게 맡기기)와 링크 대상.
 * base-ui Button은 render 앵커여도 role="button"이라 role="button" + href로 조회한다.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import EmptyTripsGuide from "@/components/trip/EmptyTripsGuide";

describe("EmptyTripsGuide (#903)", () => {
  it("두 경로 카드 제목을 보여준다", () => {
    render(<EmptyTripsGuide />);
    expect(
      screen.getByRole("heading", { name: "직접 만들기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "AI에게 맡기기" }),
    ).toBeInTheDocument();
  });

  it("'새 여행 만들기' → /trips/new (내부 이동)", () => {
    render(<EmptyTripsGuide />);
    const btn = screen.getByRole("button", { name: /새 여행 만들기/ });
    expect(btn).toHaveAttribute("href", "/trips/new");
  });

  it("'연결 방법 보기' → mcp/README (새 탭 외부 링크)", () => {
    render(<EmptyTripsGuide />);
    const link = screen.getByRole("button", { name: /연결 방법 보기/ });
    expect(link).toHaveAttribute("href", expect.stringContaining("mcp/README"));
    expect(link).toHaveAttribute("target", "_blank");
  });
});
