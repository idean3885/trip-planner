/**
 * spec 051 — CalendarView 스크롤 접힘(collapsed) 분기.
 *
 * collapsed=true 면 사용자 토글과 무관하게 주간으로 접고 자동 제어 중 토글을 숨긴다.
 * collapsed=false 면 월간(+토글)으로 복원한다. (스크롤·sticky 실거동은 실기기 정본 —
 * 여기서는 prop→렌더 경로만 검증한다.)
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CalendarView } from "@/components/trip/CalendarView";

const base = {
  tripStart: new Date(2026, 5, 6),
  tripEnd: new Date(2026, 5, 21),
  daysDates: [new Date(2026, 5, 7)],
  selected: new Date(2026, 5, 7),
  onSelect: () => {},
};

describe("CalendarView 스크롤 접힘 (spec 051)", () => {
  it("collapsed=true 면 주간으로 접고 토글을 숨긴다", () => {
    render(<CalendarView {...base} enableMobileCompact collapsed />);
    expect(screen.getByRole("group", { name: "주 달력" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "월 달력" })).toBeNull();
    expect(screen.queryByText("주간만 보기")).toBeNull();
    expect(screen.queryByText("월 전체 보기")).toBeNull();
  });

  it("collapsed=false 면 월간 + 토글을 보인다", () => {
    render(<CalendarView {...base} enableMobileCompact collapsed={false} />);
    expect(screen.getByRole("group", { name: "월 달력" })).toBeInTheDocument();
    expect(screen.getByText("주간만 보기")).toBeInTheDocument();
  });
});
