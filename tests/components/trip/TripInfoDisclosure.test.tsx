import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TripInfoDisclosure } from "@/components/trip/TripInfoDisclosure";

// spec 063 후속 — "여행 소개" 접힘(depth): 설명·인원. 기간·총액은 중복하지 않는다.

describe("TripInfoDisclosure", () => {
  it("접힘 요약 '여행 소개' + 인원·설명을 담는다", () => {
    render(
      <TripInfoDisclosure
        memberCount={2}
        descriptionHtml="<p>포르투갈 신혼여행</p>"
      />,
    );
    expect(screen.getByText("여행 소개")).toBeInTheDocument();
    expect(screen.getByText("동행자 2명")).toBeInTheDocument();
    expect(screen.getByText("포르투갈 신혼여행")).toBeInTheDocument();
  });

  it("기본 접힘(open 아님)이라 메인 동선을 가리지 않는다", () => {
    const { container } = render(
      <TripInfoDisclosure memberCount={1} descriptionHtml={null} />,
    );
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect((details as HTMLDetailsElement).open).toBe(false);
  });

  it("설명이 없으면 안내 문구, 인원은 그대로", () => {
    render(<TripInfoDisclosure memberCount={1} descriptionHtml={null} />);
    expect(screen.getByText("동행자 1명")).toBeInTheDocument();
    expect(screen.getByText("아직 설명이 없습니다.")).toBeInTheDocument();
  });

  it("기간·총액은 중복하지 않는다(브레드크럼·일정 화면 담당)", () => {
    render(
      <TripInfoDisclosure
        memberCount={2}
        descriptionHtml="<p>설명</p>"
      />,
    );
    expect(screen.queryByText(/여행 총액/)).not.toBeInTheDocument();
    expect(screen.queryByText(/~/)).not.toBeInTheDocument();
  });
});
