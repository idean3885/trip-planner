/**
 * spec 040 US2 — 캘린더 셀 일정 표현(데스크탑 제목 / 모바일·제목없음 도트).
 *
 * desktopFull(넓은 셀)에서 일정 있는 날에 Day 제목이 있으면 제목을 노출하고,
 * 제목이 없으면 도트로 폴백한다. 추가 서버 조회 없이 dayTitles 맵만 쓴다.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CalendarView } from "@/components/trip/CalendarView";

const day = new Date(2026, 5, 10); // 2026-06-10

describe("CalendarView 셀 일정 표현 (spec 040)", () => {
  it("desktopFull + Day 제목이 있으면 셀에 제목을 노출한다", () => {
    render(
      <CalendarView
        tripStart={day}
        tripEnd={day}
        daysDates={[day]}
        dayTitles={new Map([[day.toDateString(), "포르투 도착"]])}
        selected={day}
        desktopFull
      />,
    );
    expect(screen.queryByText("포르투 도착")).not.toBeNull();
  });

  it("desktopFull + 제목이 없으면 제목 텍스트 없이 도트로 폴백한다", () => {
    render(
      <CalendarView
        tripStart={day}
        tripEnd={day}
        daysDates={[day]}
        dayTitles={new Map()}
        selected={day}
        desktopFull
      />,
    );
    expect(screen.queryByText("포르투 도착")).toBeNull();
  });
});
