import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TripOverviewCard } from "@/components/trip/TripOverviewCard";

// spec 063 — 여행 개요(종합정보): 기간·인원·총액·설명. 설명 없어도 종합정보 노출.

const base = {
  startDate: new Date(2026, 5, 7),
  endDate: new Date(2026, 5, 21),
  dayCount: 15,
  memberCount: 2,
  tripSummary: [{ currency: "EUR", total: 120, advance: 80, onSite: 40 }],
  tripKrw: { krw: 177600, partial: false, anyConverted: true, rates: [] },
  descriptionHtml: "<p>포르투갈 신혼여행</p>",
};

describe("TripOverviewCard", () => {
  it("기간·일수·인원·총액·설명을 한 자리에 보인다", () => {
    render(<TripOverviewCard {...base} />);
    expect(screen.getByText("여행 개요")).toBeInTheDocument();
    expect(screen.getByText("15일")).toBeInTheDocument();
    expect(screen.getByText("2명")).toBeInTheDocument();
    expect(screen.getByText("총 사용 금액")).toBeInTheDocument();
    expect(screen.getByText(/120 EUR/)).toBeInTheDocument();
    expect(screen.getByText("포르투갈 신혼여행")).toBeInTheDocument();
  });

  it("설명이 없어도 종합정보(기간·인원·총액)는 보인다", () => {
    render(<TripOverviewCard {...base} descriptionHtml={null} />);
    expect(screen.getByText("15일")).toBeInTheDocument();
    expect(screen.getByText("2명")).toBeInTheDocument();
    expect(screen.getByText("총 사용 금액")).toBeInTheDocument();
    expect(screen.queryByText("포르투갈 신혼여행")).not.toBeInTheDocument();
  });

  it("기간 미정이면 '일정 미정', 인원은 그대로", () => {
    render(
      <TripOverviewCard
        {...base}
        startDate={null}
        endDate={null}
        dayCount={0}
        descriptionHtml={null}
      />,
    );
    expect(screen.getByText("일정 미정")).toBeInTheDocument();
    expect(screen.getByText("0일")).toBeInTheDocument();
    expect(screen.getByText("2명")).toBeInTheDocument();
  });

  it("회귀: 지출 0이면 총액 줄을 생략하되 종합정보는 유지", () => {
    render(
      <TripOverviewCard
        {...base}
        tripSummary={[]}
        tripKrw={null}
        descriptionHtml={null}
      />,
    );
    expect(screen.queryByText("총 사용 금액")).not.toBeInTheDocument();
    expect(screen.getByText("15일")).toBeInTheDocument();
    expect(screen.getByText("2명")).toBeInTheDocument();
  });
});
