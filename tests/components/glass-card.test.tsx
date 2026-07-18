/**
 * spec 065 US2 — 컨테이너 카드 유리 패널.
 * Card 글래스 opt-in 변형: glass prop on → .glass-surface, off → 불투명 bg-card.
 * 콘텐츠 카드(ActivityCard)는 glass 미사용으로 불투명 유지(스크롤 블러 스택 회피).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card } from "@/components/ui/card";

const ROOT = resolve(__dirname, "../..");

describe("Card 글래스 변형 (spec 065/glass-container)", () => {
  it("glass 미지정 시 불투명 bg-card 유지", () => {
    const { container } = render(<Card>x</Card>);
    const el = container.querySelector('[data-slot="card"]')!;
    expect(el.className).toContain("bg-card");
    expect(el.className).not.toContain("glass-surface");
    expect(el.getAttribute("data-glass")).toBeNull();
  });

  it("glass 지정 시 glass-surface로 전환되고 bg-card는 빠진다", () => {
    const { container } = render(<Card glass>x</Card>);
    const el = container.querySelector('[data-slot="card"]')!;
    expect(el.className).toContain("glass-surface");
    expect(el.className).not.toContain("bg-card");
    expect(el.getAttribute("data-glass")).toBe("true");
  });

  it("스크롤 목록의 콘텐츠 카드(여행 목록)는 glass 없이 불투명 유지", () => {
    // spec 066에서 활동 카드는 glass로 확장됐다. 여행 목록 카드는 범위 밖 — 불투명 유지.
    const src = readFileSync(resolve(ROOT, "src/app/trips/page.tsx"), "utf8");
    expect(src).not.toMatch(/<Card[^>]*\bglass\b/);
  });
});
