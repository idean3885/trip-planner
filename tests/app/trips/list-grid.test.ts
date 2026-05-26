/**
 * spec 026 묶음 C — /trips 목록 데스크탑 카드 그리드 분기 정적 검증.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../..");
const PAGE = readFileSync(resolve(REPO_ROOT, "src/app/trips/page.tsx"), "utf8");

describe("trip 목록 데스크탑 카드 그리드 (spec 026/C)", () => {
  it("그리드 wrapper에 lg:grid-cols-2 와 xl:grid-cols-3 분기가 존재한다", () => {
    expect(PAGE).toContain("lg:grid-cols-2");
    expect(PAGE).toContain("xl:grid-cols-3");
  });

  it("모바일(<lg) 분기는 단일 컬럼 — sm/md prefix로 grid-cols 지정 없음", () => {
    expect(PAGE).not.toMatch(/(?:sm|md):grid-cols-\d/);
  });

  it("gap에 spacing 토큰을 사용한다 (gap-grid-tight·gap-grid-comfy)", () => {
    expect(PAGE).toMatch(/gap-grid-(tight|comfy)/);
  });
});
