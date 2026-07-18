/**
 * spec 065 US1 — 크롬·오버레이 유리 표면.
 * 글래스 토큰·유틸(globals.css)과 헤더·푸터·오버레이(Dialog/Dropdown/Select)의
 * 글래스 클래스 부착을 소스 레벨로 가드한다. 시각·블러 체감은 실기기 정본.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

const GLOBALS = read("src/app/globals.css");
const HEADER = read("src/components/SiteHeader.tsx"); // spec 067 — 헤더 분리
const FOOTER = read("src/components/Footer.tsx");
const DIALOG = read("src/components/ui/dialog.tsx");
const DROPDOWN = read("src/components/ui/dropdown-menu.tsx");
const SELECT = read("src/components/ui/select.tsx");

describe("글래스 토큰·유틸 (spec 065/glass-tokens)", () => {
  it(":root에 글래스 토큰 6종이 정의된다", () => {
    for (const t of [
      "--glass-bg:",
      "--glass-overlay:",
      "--glass-border:",
      "--glass-blur:",
      "--glass-bg-fallback:",
      "--glass-overlay-fallback:",
    ]) {
      expect(GLOBALS).toContain(t);
    }
  });

  it(".glass-surface/.glass-overlay 유틸과 @supports 폴백이 있다", () => {
    expect(GLOBALS).toMatch(/\.glass-surface\s*\{/);
    expect(GLOBALS).toMatch(/\.glass-overlay\s*\{/);
    expect(GLOBALS).toMatch(/backdrop-filter:\s*blur\(var\(--glass-blur\)\)/);
    expect(GLOBALS).toMatch(/@supports not/);
  });

  it("글래스 유틸 블록은 :root 토큰 경유 — 하드코딩 색 없음(색상 가드)", () => {
    const block = GLOBALS.slice(
      GLOBALS.indexOf(".glass-surface {"),
      GLOBALS.indexOf("@layer base"),
    );
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    expect(block).not.toMatch(/rgba\(/);
  });
});

describe("크롬·오버레이 글래스 표면 (spec 065/glass-chrome·glass-overlay)", () => {
  it("헤더가 glass-surface 바로 렌더된다", () => {
    expect(HEADER).toContain("glass-surface");
  });

  it("푸터가 glass-surface로 렌더된다", () => {
    expect(FOOTER).toContain("glass-surface");
  });

  it("Dialog/Dropdown/Select content가 glass-overlay로 렌더된다", () => {
    expect(DIALOG).toContain("glass-overlay");
    expect(DROPDOWN).toContain("glass-overlay");
    expect(SELECT).toContain("glass-overlay");
  });

  it("오버레이 표면 배경 bg-popover가 glass-overlay로 교체됐다", () => {
    expect(DIALOG).not.toContain("bg-popover");
    expect(DROPDOWN).not.toContain("bg-popover");
    expect(SELECT).not.toContain("bg-popover");
  });
});
