/**
 * spec 064 US4 — 대문 소개 섹션 단일화 + 카드 제목 h3 시맨틱.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import FeatureHighlights from "@/components/landing/FeatureHighlights";
import { landingFeatures } from "@/lib/landing-content";

describe("소개 섹션 단일화 (spec 064/section-merge)", () => {
  it("통합 헤딩은 '계획부터 현장까지, 이렇게 돕습니다' 하나다", () => {
    render(<FeatureHighlights />);
    const heading = screen.getByRole("heading", {
      level: 2,
      name: "계획부터 현장까지, 이렇게 돕습니다",
    });
    expect(heading).toBeInTheDocument();
    // 이전 중복 섹션 헤딩은 더 이상 없다
    expect(screen.queryByText("이런 걸 할 수 있어요")).toBeNull();
    expect(screen.queryByText("할 수 있는 것")).toBeNull();
  });

  it("각 카드 제목이 h3(heading level 3)로 렌더된다", () => {
    render(<FeatureHighlights />);
    const h3s = screen.getAllByRole("heading", { level: 3 });
    expect(h3s).toHaveLength(landingFeatures.length);
    for (const f of landingFeatures) {
      expect(
        screen.getByRole("heading", { level: 3, name: f.title }),
      ).toBeInTheDocument();
    }
  });
});
