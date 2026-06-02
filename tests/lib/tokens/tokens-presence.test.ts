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

describe("Figma 디자인 색 토큰 SSOT (spec 055)", () => {
  const css = readFileSync(GLOBALS_CSS, "utf8");
  const hasDecl = (name: string) => new RegExp(`--${name}\\s*:`).test(css);

  it("디자인 등장 프리미티브 팔레트가 :root에 전수 선언된다", () => {
    const palette = [
      ["white", "#ffffff"],
      ["gray-50", "#f5f5f5"],
      ["gray-100", "#eeeeee"],
      ["gray-200", "#d9d9d9"],
      ["gray-300", "#b3b3b3"],
      ["gray-600", "#616161"],
      ["gray-700", "#333333"],
      ["gray-800", "#2f2f2f"],
      ["gray-900", "#212121"],
      ["gray-950", "#121212"],
      ["black", "#000000"],
      ["blue-500", "#17a1fa"],
      ["blue-700", "#1270b0"],
      ["green-50", "#f0ffd7"],
      ["green-600", "#629126"],
      ["green-800", "#335803"],
      ["pink-400", "#ff8a9d"],
    ] as const;
    for (const [name, value] of palette) {
      expect(hasDecl(name), `--${name} 선언 누락`).toBe(true);
      expect(css.toLowerCase()).toContain(`--${name}: ${value}`);
    }
  });

  it("캘린더 셀/헤더 상태 토큰이 :root에 전수 선언된다", () => {
    const calTokens = [
      "cal-saturday",
      "cal-sunday",
      "cal-weekday-header",
      "cal-trip-weekend",
      "cal-trip-weekend-dark",
      "cal-selected-bg",
      "cal-selected-text",
      "cal-today-border",
      "cal-inactive",
      "cal-inactive-strong",
      "cal-weekend-inactive",
      "cal-fill-weekend",
      "cal-fill-weekday",
    ];
    for (const name of calTokens) {
      expect(hasDecl(name), `--${name} 선언 누락`).toBe(true);
    }
  });

  it("동행 배너 토큰이 :root에 선언된다", () => {
    expect(hasDecl("banner")).toBe(true);
    expect(hasDecl("banner-foreground")).toBe(true);
  });

  it("shadcn 시맨틱 토큰이 무채색 oklch가 아닌 디자인 팔레트(var)로 매핑된다", () => {
    expect(css).toMatch(/--foreground:\s*var\(--gray-950\)/);
    expect(css).toMatch(/--background:\s*var\(--white\)/);
    expect(css).toMatch(/--border:\s*var\(--gray-200\)/);
    expect(css).toMatch(/--muted-foreground:\s*var\(--gray-600\)/);
    expect(css).toMatch(/--ring:\s*var\(--blue-500\)/);
  });

  it("Inter 폰트가 --font-sans/--font-heading 정본에 연결된다", () => {
    expect(css).toContain("var(--font-inter)");
    expect(css).toMatch(/--font-sans:/);
    expect(css).toMatch(/--font-heading:/);
  });

  it("라이트 전용 — .dark 색 블록을 도입하지 않는다", () => {
    expect(css).not.toMatch(/\.dark\s*\{/);
  });
});
