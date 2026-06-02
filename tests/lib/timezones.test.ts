/**
 * spec 035 (#633) — 타임존 정본 목록.
 *
 * 스페인·포르투갈 등 여행지 타임존이 정본에 있고, DraftSection 이 로컬 하드코딩
 * 대신 정본을 참조하는지(중복 0) 확인한다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { TIMEZONE_OPTIONS } from "@/lib/timezones";

describe("TIMEZONE_OPTIONS 정본", () => {
  it("스페인·포르투갈 타임존을 포함한다", () => {
    expect(TIMEZONE_OPTIONS).toContain("Europe/Madrid");
    expect(TIMEZONE_OPTIONS).toContain("Europe/Lisbon");
  });

  it("기존 타임존(Asia/Seoul·UTC)을 유지한다", () => {
    expect(TIMEZONE_OPTIONS).toContain("Asia/Seoul");
    expect(TIMEZONE_OPTIONS).toContain("UTC");
  });

  it("DraftSection 은 로컬 하드코딩 없이 정본을 참조한다", () => {
    const src = readFileSync(
      resolve(
        __dirname,
        "../../src/components/calendar-sync/sections/DraftSection.tsx",
      ),
      "utf8",
    );
    expect(src).toMatch(/from "@\/lib\/timezones"/);
    // 로컬 const TIMEZONE_OPTIONS = [ ... ] 재정의가 없어야 한다(중복 0).
    expect(src).not.toMatch(/const TIMEZONE_OPTIONS\s*=\s*\[/);
  });
});
