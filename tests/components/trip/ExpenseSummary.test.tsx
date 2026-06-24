import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExpenseSummary } from "@/components/trip/ExpenseSummary";

// spec 061 US4 (#811) — 금액 합산 표시.

describe("ExpenseSummary", () => {
  it("빈 합산은 렌더하지 않는다", () => {
    const { container } = render(<ExpenseSummary rows={[]} label="여행 총액" />);
    expect(container.firstChild).toBeNull();
  });

  it("라벨과 통화별 총액을 보인다", () => {
    render(
      <ExpenseSummary
        rows={[{ currency: "EUR", total: 35, advance: 10, onSite: 25 }]}
        label="여행 총액"
      />,
    );
    expect(screen.getByText("여행 총액")).toBeInTheDocument();
    expect(screen.getByText(/35 EUR/)).toBeInTheDocument();
  });

  it("사전·현장이 모두 있으면 소계를 덧붙인다", () => {
    render(
      <ExpenseSummary
        rows={[{ currency: "EUR", total: 35, advance: 10, onSite: 25 }]}
        label="이 날"
      />,
    );
    expect(screen.getByText(/사전 10/)).toBeInTheDocument();
    expect(screen.getByText(/현장/)).toBeInTheDocument();
  });

  it("한쪽 소계만 있으면 소계 표기를 생략한다", () => {
    render(
      <ExpenseSummary
        rows={[{ currency: "KRW", total: 1000, advance: 1000, onSite: 0 }]}
        label="이 날"
      />,
    );
    expect(screen.getByText(/1,000 KRW/)).toBeInTheDocument();
    expect(screen.queryByText(/사전/)).not.toBeInTheDocument();
  });

  it("통화별 라인을 모두 보인다", () => {
    render(
      <ExpenseSummary
        rows={[
          { currency: "EUR", total: 35, advance: 10, onSite: 25 },
          { currency: "KRW", total: 1000, advance: 0, onSite: 1000 },
        ]}
        label="여행 총액"
      />,
    );
    expect(screen.getByText(/35 EUR/)).toBeInTheDocument();
    expect(screen.getByText(/1,000 KRW/)).toBeInTheDocument();
  });
});

// spec 062 — 원화 자동 근사 환산 병기.
describe("ExpenseSummary 원화 병기 (spec 062)", () => {
  const rows = [{ currency: "EUR", total: 35, advance: 0, onSite: 35 }];

  it("krw 기여분이 있으면 '약 …원 (참고)'를 병기한다", () => {
    render(
      <ExpenseSummary
        rows={rows}
        label="이 날"
        krw={{ krw: 51800, partial: false, anyConverted: true }}
      />,
    );
    expect(screen.getByText(/약 51,800원/)).toBeInTheDocument();
    expect(screen.getByText(/참고/)).toBeInTheDocument();
  });

  it("부분 반영이면 '일부 통화만'을 덧붙인다", () => {
    render(
      <ExpenseSummary
        rows={rows}
        label="이 날"
        krw={{ krw: 51800, partial: true, anyConverted: true }}
      />,
    );
    expect(screen.getByText(/일부 통화만/)).toBeInTheDocument();
  });

  it("환산 기여분이 없으면(anyConverted=false) 원화 병기를 생략한다", () => {
    render(
      <ExpenseSummary
        rows={rows}
        label="이 날"
        krw={{ krw: 0, partial: true, anyConverted: false }}
      />,
    );
    expect(screen.queryByText(/원/)).not.toBeInTheDocument();
    expect(screen.getByText(/35 EUR/)).toBeInTheDocument();
  });

  it("회귀: krw 미전달 시 기존 현화-only 합산 그대로", () => {
    render(<ExpenseSummary rows={rows} label="이 날" />);
    expect(screen.getByText(/35 EUR/)).toBeInTheDocument();
    expect(screen.queryByText(/참고/)).not.toBeInTheDocument();
  });
});
