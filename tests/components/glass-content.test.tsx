/**
 * spec 066 — 글래스모피즘 확장(여행 상세 콘텐츠 + 카드 테두리 선명화).
 * 활동 카드 glass 렌더 + 주간 달력 래퍼 glass-surface + 카드 테두리 대비 상향을 가드한다.
 * 시각·스크롤 성능은 실기기 정본.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { ActivityCategory, PaymentTiming } from "@prisma/client";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ActivityCard from "@/components/ActivityCard";

const ROOT = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

function makeActivity(overrides = {}) {
  return {
    id: 1,
    category: "SIGHTSEEING" as ActivityCategory,
    title: "벨렝 탑 방문",
    startTime: "2026-06-07T09:00:00.000Z",
    endTime: "2026-06-07T11:00:00.000Z",
    location: "Torre de Belém",
    memo: null,
    cost: null,
    currency: "EUR",
    paymentTiming: "ON_SITE" as PaymentTiming,
    ...overrides,
  };
}

describe("글래스 콘텐츠 확장 (spec 066/glass-content)", () => {
  it("활동 카드가 glass 표면으로 렌더된다", () => {
    const { container } = render(<ActivityCard activity={makeActivity()} />);
    const card = container.querySelector('[data-slot="card"]')!;
    expect(card.className).toContain("glass-surface");
    expect(card.getAttribute("data-glass")).toBe("true");
    expect(card.className).not.toContain("bg-card");
  });

  it("여행 상세 모바일 주간 달력 래퍼가 glass-surface로 렌더된다", () => {
    const src = read("src/components/trip/TripDetailLayout.tsx");
    expect(src).toMatch(/glass-surface[^"]*sticky top-0 z-20/);
    expect(src).not.toMatch(/"bg-card ring-foreground\/10 sticky top-0/);
  });
});

describe("카드 테두리 선명화 (spec 066/border-crisp)", () => {
  it("card.tsx 기본 카드 테두리 대비가 상향됐다(ring-foreground/15)", () => {
    const src = read("src/components/ui/card.tsx");
    expect(src).toContain("ring-foreground/15");
    expect(src).not.toMatch(/group\/card[^"]*ring-foreground\/10/);
  });
});
