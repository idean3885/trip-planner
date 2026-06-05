import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { autoPatExpiry, AUTO_PAT_TTL_DAYS } =
  await import("@/lib/token-helpers");

describe("autoPatExpiry (spec 059)", () => {
  it("자동 발급 기본 수명은 30일", () => {
    expect(AUTO_PAT_TTL_DAYS).toBe(30);
  });

  it("from 기준 +30일 Date 를 돌린다", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    const exp = autoPatExpiry(from);
    expect(exp).toBeInstanceOf(Date);
    expect(exp.getTime()).toBe(from.getTime() + 30 * 24 * 60 * 60 * 1000);
  });
});
