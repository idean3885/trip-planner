import { beforeEach, describe, expect, it } from "vitest";

import { readCheckedTripIds, writeCheckedTripIds } from "@/lib/user-prefs";

beforeEach(() => {
  window.localStorage.clear();
});

describe("user-prefs: readCheckedTripIds / writeCheckedTripIds", () => {
  it("기본값은 빈 배열", () => {
    expect(readCheckedTripIds()).toEqual([]);
  });

  it("write 후 read 가 정합", () => {
    writeCheckedTripIds([1, 2, 3]);
    expect(readCheckedTripIds()).toEqual([1, 2, 3]);
  });

  it("중복 제거 + finite 값만 보존", () => {
    writeCheckedTripIds([1, 1, 2, NaN, 3, 2]);
    expect(readCheckedTripIds()).toEqual([1, 2, 3]);
  });

  it("localStorage 파손 시 빈 배열 fallback", () => {
    window.localStorage.setItem(
      "trip-planner:prefs:v1:multi-trip-calendar:checked-trip-ids",
      "not-json",
    );
    expect(readCheckedTripIds()).toEqual([]);
  });

  it("배열이 아닌 값 저장 후에도 빈 배열 fallback", () => {
    window.localStorage.setItem(
      "trip-planner:prefs:v1:multi-trip-calendar:checked-trip-ids",
      JSON.stringify({ not: "array" }),
    );
    expect(readCheckedTripIds()).toEqual([]);
  });
});
