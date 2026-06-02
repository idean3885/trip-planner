/**
 * spec 039 — /trips 홈 목록 레이아웃 정적 검증.
 *
 * spec 039 변경 (#703): spec 031 의 좌(통합 캘린더)/우(카드 목록) 2분할을 제거하고
 * 여행 목록 카드만 단일 컬럼으로 나열한다. 통합 캘린더(TripsCalendar)는 홈 전용
 * dead code 로 삭제됐다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(__dirname, "../../..");
const PAGE = readFileSync(resolve(REPO_ROOT, "src/app/trips/page.tsx"), "utf8");

describe("trip 목록 홈 레이아웃 (spec 039)", () => {
  it("통합 캘린더(TripsCalendar)를 마운트하지 않는다 — spec 039 #703", () => {
    expect(PAGE).not.toContain("TripsCalendar");
  });

  it("2분할 grid(lg:grid-cols-2)를 쓰지 않는다 — 단일 컬럼 목록", () => {
    expect(PAGE).not.toContain("lg:grid-cols-2");
  });

  it("어떤 분기에서도 grid-cols-N 다중 컬럼을 쓰지 않는다 — 단일 컬럼", () => {
    expect(PAGE).not.toMatch(/grid-cols-\d/);
  });

  it("gap에 spacing 토큰을 사용한다 (gap-grid-tight·gap-grid-comfy)", () => {
    expect(PAGE).toMatch(/gap-grid-(tight|comfy)/);
  });

  it("여행 목록 카드 진입 링크가 존재한다", () => {
    expect(PAGE).toMatch(/href={`\/trips\/\$\{trip\.id\}`}/);
  });
});
