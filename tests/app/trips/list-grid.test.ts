/**
 * spec 026 묶음 C + spec 031 — /trips 목록 데스크탑 그리드 분기 정적 검증.
 *
 * spec 031 변경 (#608): 카드 목록 단독 1/2/3 컬럼 분기에서 좌·우 2 컬럼
 * (좌측 통합 캘린더 + 우측 카드 목록) 으로 단순화. 우측 카드 목록은 단일
 * 컬럼으로 세로 나열. xl:grid-cols-3 분기는 제거됨.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../..");
const PAGE = readFileSync(resolve(REPO_ROOT, "src/app/trips/page.tsx"), "utf8");

describe("trip 목록 데스크탑 그리드 (spec 026/C + spec 031)", () => {
  it("본문 wrapper에 lg:grid-cols-2 분기가 존재한다 — spec 031 좌(캘린더)/우(목록) 2분할", () => {
    expect(PAGE).toContain("lg:grid-cols-2");
  });

  it("모바일(<lg) 분기는 단일 컬럼 — sm/md prefix로 grid-cols 지정 없음", () => {
    expect(PAGE).not.toMatch(/(?:sm|md):grid-cols-\d/);
  });

  it("gap에 spacing 토큰을 사용한다 (gap-grid-tight·gap-grid-comfy)", () => {
    expect(PAGE).toMatch(/gap-grid-(tight|comfy)/);
  });

  it("좌측 통합 캘린더 컴포넌트가 마운트된다 — spec 031 #608", () => {
    expect(PAGE).toContain("TripsCalendar");
  });
});
