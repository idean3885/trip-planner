/**
 * #645 — 여행 상세 부가 정보 묶음. 동행자(위) + 외부 캘린더 동기화(아래)를
 * 순서대로 한 묶음에 담는다.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TripDetailExtras } from "@/components/trip/TripDetailExtras";

describe("TripDetailExtras", () => {
  it("동행자를 위, 외부 캘린더를 아래 순서로 렌더한다", () => {
    render(
      <TripDetailExtras
        members={<div data-testid="members">동행자</div>}
        sync={<div data-testid="sync">외부 캘린더</div>}
      />,
    );
    const members = screen.getByTestId("members");
    const sync = screen.getByTestId("sync");
    expect(members).toBeInTheDocument();
    expect(sync).toBeInTheDocument();
    // DOM 순서상 동행자가 외부 캘린더보다 앞.
    expect(
      members.compareDocumentPosition(sync) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
