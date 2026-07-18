/**
 * spec 067 — 글래스 캘린더 재설계 + 글래스 카드 테두리 버그 수정.
 * 스타일 전환을 소스 레벨로 가드한다(시각·아티팩트·대비는 실기기 정본).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

const CARD = read("src/components/ui/card.tsx");
const GLOBALS = read("src/app/globals.css");
const CAL_VIEW = read("src/components/trip/CalendarView.tsx");
const CAL_UI = read("src/components/ui/calendar.tsx");

describe("글래스 카드 테두리 버그 수정 (spec 067/card-artifact)", () => {
  it("글래스 카드는 overflow-hidden을 쓰지 않고 비글래스만 유지한다", () => {
    expect(CARD).toContain(
      'glass ? "glass-surface" : "bg-card overflow-hidden"',
    );
    // 공용 base className 문자열에는 overflow-hidden 이 없어야 한다
    const baseLine = CARD.split("\n").find((l) =>
      l.includes("group/card text-card-foreground"),
    );
    expect(baseLine).toBeDefined();
    expect(baseLine).not.toContain("overflow-hidden");
  });
});

describe("글래스 캘린더 토큰·스타일 (spec 067/cal-glass)", () => {
  it(":root에 캘린더 글래스 토큰이 정의된다", () => {
    for (const t of [
      "--cal-selected-glass:",
      "--cal-range-band:",
      "--cal-ring:",
      "--cal-activity-bar:",
    ]) {
      expect(GLOBALS).toContain(t);
    }
  });

  it("월 뷰(.trip-cal) 선택/오늘이 글래스 톤으로 전환됐다(솔리드 필·검은 박스 제거)", () => {
    // 선택 = 프로스트 틴트 + 링
    expect(GLOBALS).toMatch(
      /data-selected-single="true"[^}]*--cal-selected-glass/,
    );
    expect(GLOBALS).toMatch(/data-selected-single="true"[^}]*--cal-ring/);
    // 오늘 = 브랜드 링(검은 today-border 제거)
    expect(GLOBALS).toMatch(/rdp-today[\s\S]*?--cal-ring/);
    // 여행기간 반투명 밴드
    expect(GLOBALS).toMatch(/\.cal-range\s*\{[^}]*--cal-range-band/);
  });

  it("주간 렌더러·활동 바가 브랜드 톤으로 전환됐다(bg-primary 검은 선 제거)", () => {
    expect(CAL_VIEW).toContain("--cal-activity-bar");
    expect(CAL_VIEW).toContain("--cal-selected-glass");
    // 활동 표시·선택에 솔리드 bg-primary 를 더는 쓰지 않는다
    expect(CAL_VIEW).not.toContain("bg-primary");
    expect(CAL_VIEW).not.toContain("bg-cal-selected-bg");
  });
});

describe("캘린더 사이즈 (spec 067/cal-size)", () => {
  it("셀 종횡비가 정사각보다 낮다(가로>세로)", () => {
    expect(CAL_UI).toContain("aspect-[6/5]");
    expect(CAL_UI).not.toContain("aspect-square");
  });
});
