/**
 * #669 — 일정 윈도우 로딩 계산.
 */
import { describe, expect, it } from "vitest";

import { missingFetchRange, windowYmds, ymdLocal } from "@/lib/activity-window";

describe("ymdLocal", () => {
  it("로컬 기준 YYYY-MM-DD 로 변환한다", () => {
    expect(ymdLocal(new Date(2026, 5, 7))).toBe("2026-06-07");
    expect(ymdLocal(new Date(2026, 11, 1))).toBe("2026-12-01");
  });
});

describe("windowYmds", () => {
  it("center 기준 앞뒤 radius 일을 포함한다", () => {
    const w = windowYmds(new Date(2026, 5, 7), 3);
    expect(w).toHaveLength(7);
    expect(w[0]).toBe("2026-06-04");
    expect(w[3]).toBe("2026-06-07");
    expect(w[6]).toBe("2026-06-10");
  });
});

describe("missingFetchRange", () => {
  const iso = (y: number, m: number, d: number) =>
    new Date(Date.UTC(y, m, d, 0, 0)).toISOString();
  const index = [
    { id: 1, date: iso(2026, 5, 6) },
    { id: 2, date: iso(2026, 5, 7) },
    { id: 3, date: iso(2026, 5, 8) },
    { id: 4, date: iso(2026, 5, 20) }, // 윈도우 밖
  ];

  it("윈도우 안에서 캐시에 없는 Day 들의 날짜 범위를 만든다", () => {
    const range = missingFetchRange(new Date(2026, 5, 7), 3, index, new Set());
    expect(range).toEqual({ from: "2026-06-06", to: "2026-06-08" });
  });

  it("이미 로드된 Day 는 제외한다", () => {
    const range = missingFetchRange(
      new Date(2026, 5, 7),
      3,
      index,
      new Set([1, 2]),
    );
    expect(range).toEqual({ from: "2026-06-08", to: "2026-06-08" });
  });

  it("윈도우 안이 모두 로드됐으면 null", () => {
    const range = missingFetchRange(
      new Date(2026, 5, 7),
      3,
      index,
      new Set([1, 2, 3]),
    );
    expect(range).toBeNull();
  });

  it("윈도우 밖 Day 는 받지 않는다", () => {
    const range = missingFetchRange(new Date(2026, 5, 20), 1, index, new Set());
    // 06-19 ~ 06-21 중 인덱스에 있는 건 06-20(id 4)뿐.
    expect(range).toEqual({ from: "2026-06-20", to: "2026-06-20" });
  });
});
