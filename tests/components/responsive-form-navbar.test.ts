/**
 * spec 026 묶음 D — ActivityForm + 글로벌 layout header의 데스크탑 분기 정적 검증.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../..");
const FORM = readFileSync(resolve(REPO_ROOT, "src/components/ActivityForm.tsx"), "utf8");
const LAYOUT = readFileSync(resolve(REPO_ROOT, "src/app/layout.tsx"), "utf8");

describe("ActivityForm 데스크탑 분기 (spec 026/D)", () => {
  it("폼이 데스크탑에서 가운데 정렬 + 최대 폭 제한된다", () => {
    expect(FORM).toContain("lg:mx-auto");
    expect(FORM).toContain("lg:max-w-2xl");
  });
});

describe("글로벌 header 데스크탑 가로 액션 (spec 026/D)", () => {
  it("nav 요소가 hidden lg:flex 로 모바일에서 숨겨지고 데스크탑에서 가로 노출된다", () => {
    expect(LAYOUT).toMatch(/hidden lg:flex/);
  });

  it("데스크탑 nav에 '여행 목록' 링크가 포함된다", () => {
    expect(LAYOUT).toMatch(/href="\/trips"[^>]*>\s*여행 목록/);
  });

  it("데스크탑 nav에 'API 문서' 링크가 포함된다", () => {
    expect(LAYOUT).toMatch(/href="\/docs"[^>]*>\s*API 문서/);
  });
});
