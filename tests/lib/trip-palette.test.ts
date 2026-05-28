import { describe, it, expect } from "vitest";
import { getTripColor, TRIP_PALETTE_SIZE } from "@/lib/trip-palette";

describe("getTripColor", () => {
  it("같은 trip ID 는 항상 같은 색 (결정적)", () => {
    expect(getTripColor(7)).toEqual(getTripColor(7));
    expect(getTripColor(123)).toEqual(getTripColor(123));
  });

  it("palette 인덱스가 1..PALETTE_SIZE 범위 안에 있다", () => {
    for (const id of [0, 1, 5, 6, 100, 9999]) {
      const c = getTripColor(id);
      expect(c.index).toBeGreaterThanOrEqual(1);
      expect(c.index).toBeLessThanOrEqual(TRIP_PALETTE_SIZE);
    }
  });

  it("palette 순환 — tripId 0 과 PALETTE_SIZE 가 같은 색", () => {
    expect(getTripColor(0).index).toBe(getTripColor(TRIP_PALETTE_SIZE).index);
  });

  it("cssVar 가 globals.css 변수 참조 형식", () => {
    const c = getTripColor(3);
    expect(c.cssVar).toBe(`var(--trip-palette-${c.index})`);
  });

  it("음수/NaN 등 잘못된 ID 는 첫 색으로 fallback", () => {
    expect(getTripColor(-1).index).toBe(1);
    expect(getTripColor(NaN).index).toBe(1);
  });
});
