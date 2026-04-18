import { describe, it, expect } from "vitest";
import { toTimestamp } from "@/lib/activity-time";

/**
 * toTimestamp(#232 수정 포함) 단위 테스트.
 *
 * 핵심 요구:
 *   - HH:mm + timezone → 로컬 벽시각을 UTC로 변환해 저장.
 *   - timezone === null/undefined → 과거 동작(UTC HH:mm) 유지.
 *   - `T`가 포함된 full ISO는 `new Date()`로 파싱.
 *   - undefined → undefined, null/빈 문자열 → null.
 */
describe("toTimestamp", () => {
  const day = new Date("2026-06-07T00:00:00Z");

  it("undefined는 undefined 반환", () => {
    expect(toTimestamp(undefined, day, "Asia/Seoul")).toBeUndefined();
  });

  it("null은 null 반환", () => {
    expect(toTimestamp(null, day, "Asia/Seoul")).toBeNull();
  });

  it("빈 문자열은 null 반환", () => {
    expect(toTimestamp("", day, "Asia/Seoul")).toBeNull();
  });

  it("잘못된 형식은 null 반환", () => {
    expect(toTimestamp("not-a-time", day, "Asia/Seoul")).toBeNull();
  });

  it("full ISO 문자열은 그대로 파싱", () => {
    const r = toTimestamp("2026-06-07T10:00:00Z", day, "Asia/Seoul");
    expect(r).toBeInstanceOf(Date);
    expect((r as Date).toISOString()).toBe("2026-06-07T10:00:00.000Z");
  });

  it("Seoul 13:00 + Asia/Seoul → 04:00 UTC", () => {
    const r = toTimestamp("13:00", day, "Asia/Seoul") as Date;
    expect(r.toISOString()).toBe("2026-06-07T04:00:00.000Z");
  });

  it("Lisbon 20:15 + Europe/Lisbon(WEST, UTC+1) → 19:15 UTC (2026-06-07은 DST 적용)", () => {
    const r = toTimestamp("20:15", day, "Europe/Lisbon") as Date;
    expect(r.toISOString()).toBe("2026-06-07T19:15:00.000Z");
  });

  it("Lisbon 09:00 + Europe/Lisbon 겨울(WET, UTC+0) → 09:00 UTC", () => {
    const winterDay = new Date("2026-01-15T00:00:00Z");
    const r = toTimestamp("09:00", winterDay, "Europe/Lisbon") as Date;
    expect(r.toISOString()).toBe("2026-01-15T09:00:00.000Z");
  });

  it("null timezone → 과거 UTC 동작(HH:mm을 UTC로 저장)", () => {
    const r = toTimestamp("13:00", day, null) as Date;
    expect(r.toISOString()).toBe("2026-06-07T13:00:00.000Z");
  });

  it("undefined timezone → 과거 UTC 동작", () => {
    const r = toTimestamp("13:00", day, undefined) as Date;
    expect(r.toISOString()).toBe("2026-06-07T13:00:00.000Z");
  });

  it("America/New_York(EDT, UTC-4) 여름 09:30 → 13:30 UTC", () => {
    const summerDay = new Date("2026-07-04T00:00:00Z");
    const r = toTimestamp("09:30", summerDay, "America/New_York") as Date;
    expect(r.toISOString()).toBe("2026-07-04T13:30:00.000Z");
  });

  it("HH:mm:ss 포맷도 HH:mm 부분만 인식", () => {
    const r = toTimestamp("13:00:45", day, "Asia/Seoul") as Date;
    expect(r.toISOString()).toBe("2026-06-07T04:00:00.000Z");
  });

  it("Pacific/Auckland(NZST, UTC+12) 겨울 23:45 → 같은 날 11:45 UTC", () => {
    // Day.date는 UTC 자정 기준 "로컬 달력 날짜"다. 2026-07-01 NZ = 2026-07-01T12:00:00Z(UTC).
    // 벽시각 2026-07-01 23:45 @ +12:00 = 2026-07-01 11:45Z.
    const winterDay = new Date("2026-07-01T00:00:00Z");
    const r = toTimestamp("23:45", winterDay, "Pacific/Auckland") as Date;
    expect(r.toISOString()).toBe("2026-07-01T11:45:00.000Z");
  });

  it("Pacific/Auckland(+12) 00:30 → 전일 12:30 UTC", () => {
    // 벽시각 2026-07-01 00:30 @ +12:00 = 2026-06-30 12:30Z.
    const day2 = new Date("2026-07-01T00:00:00Z");
    const r = toTimestamp("00:30", day2, "Pacific/Auckland") as Date;
    expect(r.toISOString()).toBe("2026-06-30T12:30:00.000Z");
  });
});
