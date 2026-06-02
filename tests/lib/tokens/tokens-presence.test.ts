/**
 * spec 026 — design/tokens.json + globals.css의 반응형 토큰 SSOT 검증.
 *
 * 신규 페이지·컴포넌트가 임의 px 대신 본 토큰을 참조하도록 SSOT를 강제.
 * 임의 px이 작업 대상 코드에 잔존하지 않는지는 quickstart 회귀 라운드에서 grep으로 별도 확인.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(__dirname, "../../..");
const TOKENS_JSON = resolve(REPO_ROOT, "design/tokens.json");
const GLOBALS_CSS = resolve(REPO_ROOT, "src/app/globals.css");

function loadTokens(): Record<string, Record<string, { $value: string }>> {
  return JSON.parse(readFileSync(TOKENS_JSON, "utf8"));
}

function loadGenerated(): string {
  const css = readFileSync(GLOBALS_CSS, "utf8");
  const begin = css.indexOf("/* BEGIN:tokens");
  const end = css.indexOf("/* END:tokens */");
  if (begin === -1 || end === -1 || end < begin) {
    throw new Error("BEGIN/END sentinel markers not found in globals.css");
  }
  return css.slice(begin, end);
}

describe("design tokens SSOT (spec 026)", () => {
  it("breakpoint 4종이 design/tokens.json에 정의되어 있다", () => {
    const tokens = loadTokens();
    expect(tokens.breakpoint).toBeDefined();
    expect(tokens.breakpoint.mobile.$value).toBe("480px");
    expect(tokens.breakpoint.tablet.$value).toBe("768px");
    expect(tokens.breakpoint.desktop.$value).toBe("1024px");
    expect(tokens.breakpoint.wide.$value).toBe("1440px");
  });

  it("container max-width 3종이 정의되어 있다", () => {
    const tokens = loadTokens();
    expect(tokens.container).toBeDefined();
    expect(tokens.container.narrow.$value).toBe("768px");
    expect(tokens.container.content.$value).toBe("1280px");
    expect(tokens.container.wide.$value).toBe("1440px");
  });

  it("spacing grid gap 2종이 정의되어 있다", () => {
    const tokens = loadTokens();
    expect(tokens.spacing).toBeDefined();
    expect(tokens.spacing["grid-tight"].$value).toBe("0.75rem");
    expect(tokens.spacing["grid-comfy"].$value).toBe("1.25rem");
  });

  it("globals.css의 BEGIN/END 블록이 토큰을 CSS variable로 노출한다", () => {
    const generated = loadGenerated();
    const expectedVars = [
      "--breakpoint-mobile",
      "--breakpoint-tablet",
      "--breakpoint-desktop",
      "--breakpoint-wide",
      "--container-narrow",
      "--container-content",
      "--container-wide",
      "--spacing-grid-tight",
      "--spacing-grid-comfy",
    ];
    for (const v of expectedVars) {
      expect(generated).toContain(v);
    }
  });

  it("breakpoint 값이 모바일 < 태블릿 < 데스크탑 < 와이드 순으로 단조 증가한다", () => {
    const tokens = loadTokens();
    const px = (v: string) => Number.parseInt(v.replace("px", ""), 10);
    const m = px(tokens.breakpoint.mobile.$value);
    const t = px(tokens.breakpoint.tablet.$value);
    const d = px(tokens.breakpoint.desktop.$value);
    const w = px(tokens.breakpoint.wide.$value);
    expect(m).toBeLessThan(t);
    expect(t).toBeLessThan(d);
    expect(d).toBeLessThan(w);
  });
});
