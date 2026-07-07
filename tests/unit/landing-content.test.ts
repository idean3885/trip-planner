import { describe, expect, it } from "vitest";

import { landingFeatures, landingValues } from "@/lib/landing-content";

describe("landing-content schema", () => {
  describe("landingValues", () => {
    it("has 3~5 entries (guideline)", () => {
      expect(landingValues.length).toBeGreaterThanOrEqual(3);
      expect(landingValues.length).toBeLessThanOrEqual(5);
    });

    it("each value title fits mobile width (<= 28 chars)", () => {
      for (const v of landingValues) {
        expect(
          v.title.length,
          `title too long: "${v.title}"`,
        ).toBeLessThanOrEqual(28);
      }
    });

    it("each value has non-empty description", () => {
      for (const v of landingValues) {
        expect(v.description.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe("landingFeatures", () => {
    it("has 2~3 entries", () => {
      expect(landingFeatures.length).toBeGreaterThanOrEqual(2);
      expect(landingFeatures.length).toBeLessThanOrEqual(3);
    });

    it("each feature has at least one bullet", () => {
      for (const f of landingFeatures) {
        expect(f.bullets.length).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
