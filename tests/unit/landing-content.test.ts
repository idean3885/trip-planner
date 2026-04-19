import { describe, it, expect } from "vitest";
import {
  landingValues,
  landingFeatures,
  landingTechStack,
} from "@/lib/landing-content";

describe("landing-content schema", () => {
  describe("landingValues", () => {
    it("has 3~5 entries (guideline)", () => {
      expect(landingValues.length).toBeGreaterThanOrEqual(3);
      expect(landingValues.length).toBeLessThanOrEqual(5);
    });

    it("each value title fits mobile width (<= 28 chars)", () => {
      for (const v of landingValues) {
        expect(v.title.length, `title too long: "${v.title}"`).toBeLessThanOrEqual(28);
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

  describe("landingTechStack", () => {
    it("total items count <= 20 (avoid badge overload)", () => {
      const total = landingTechStack.reduce(
        (sum, c) => sum + c.items.length,
        0,
      );
      expect(total).toBeLessThanOrEqual(20);
    });

    it("every category has at least one item", () => {
      for (const c of landingTechStack) {
        expect(c.items.length).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
