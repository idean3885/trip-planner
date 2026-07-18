/**
 * spec 068 — 여행 상세 마감 배치(브레드크럼·카드 테두리·캘린더 블렌딩·일정 표시).
 * 소스 레벨 회귀 가드. 시각은 실기기 정본.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

const TRIP_PAGE = read("src/app/trips/[id]/page.tsx");
const CARD = read("src/components/ui/card.tsx");
const GLOBALS = read("src/app/globals.css");
const DETAIL = read("src/components/trip/TripDetailLayout.tsx");
const CAL_UI = read("src/components/ui/calendar.tsx");
const CAL_VIEW = read("src/components/trip/CalendarView.tsx");

describe("브레드크럼 (spec 068/breadcrumb-fix)", () => {
  it("'여행 목록' 브레드크럼이 /trips 로 간다(인덱스 아님)", () => {
    expect(TRIP_PAGE).toMatch(/href="\/trips"[\s\S]*?여행 목록/);
    expect(TRIP_PAGE).not.toMatch(/href="\/"[\s\S]{0,40}여행 목록/);
  });
});

describe("카드 테두리 근본 수정 (spec 068/card-border)", () => {
  it("카드가 ring 대신 border 로 테두리를 그린다", () => {
    const baseLine = CARD.split("\n").find((l) =>
      l.includes("group/card text-card-foreground"),
    )!;
    expect(baseLine).toContain("border-foreground/10");
    expect(baseLine).toContain(" border ");
    expect(baseLine).not.toContain("ring-1");
    expect(baseLine).not.toContain("ring-foreground");
  });

  it("글래스 유틸이 border-color 를 강제하지 않는다(border 유틸 우선)", () => {
    const surface = GLOBALS.slice(
      GLOBALS.indexOf(".glass-surface {"),
      GLOBALS.indexOf("@supports"),
    );
    expect(surface).not.toContain("border-color");
  });
});

describe("캘린더 블렌딩·사이즈 (spec 068/calendar-blend)", () => {
  it("캘린더 래퍼가 흰 글래스 박스 대신 backdrop-blur(투명)로 렌더", () => {
    expect(DETAIL).toMatch(/sticky top-0 z-20[^"]*backdrop-blur/);
    expect(DETAIL).not.toMatch(/glass-surface[^"]*sticky top-0 z-20/);
  });
  it("셀 종횡비가 7/5 로 더 낮아졌다", () => {
    expect(CAL_UI).toContain("aspect-[7/5]");
    expect(CAL_UI).not.toContain("aspect-square");
  });
});

describe("일정 표시 (spec 068/activity-dot)", () => {
  it("일정 있는 날 표시가 연결 바 대신 점(dot)이다", () => {
    // 월 modifier: 중앙 정렬 size-1 dot (inset-x-0 h-0.5 바 아님)
    expect(CAL_VIEW).toMatch(/after:size-1[\s\S]*?after:rounded-full/);
    expect(CAL_VIEW).not.toContain("after:inset-x-0");
  });
  it("기간 밴드가 세그먼트 끝만 라운딩한다(가운데 연속)", () => {
    expect(GLOBALS).toContain(":not(.cal-range) + .cal-range");
    expect(GLOBALS).toContain(".cal-range:has(+ :not(.cal-range))");
  });
});
