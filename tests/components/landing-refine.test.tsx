/**
 * spec 070 — 대문 정보위계·카피 정리(소스 레벨 회귀 가드). 시각·여백은 실기기.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const read = (p: string) =>
  readFileSync(resolve(ROOT, `src/components/landing/${p}`), "utf8");

const HERO = read("Hero.tsx");
const BOTTOM = read("BottomCta.tsx");
const FEATURES = read("FeatureHighlights.tsx");
const DEMO = read("DemoShowcase.tsx");
const LANDING = read("LandingPage.tsx");

describe("하단 CTA 카피 (spec 070/landing-copy)", () => {
  it("인증수단 언급 서브텍스트를 제거했다", () => {
    expect(BOTTOM).not.toContain("Google 계정으로 로그인");
  });
});

describe("섹션 제목 위계 (spec 070/heading-scale)", () => {
  it.each([
    ["FeatureHighlights", FEATURES],
    ["DemoShowcase", DEMO],
    ["BottomCta", BOTTOM],
  ])(
    "%s 제목이 킥커(uppercase)가 아닌 큰 semibold foreground 로 상향됐다",
    (_n, src) => {
      expect(src).not.toContain("uppercase");
      expect(src).toContain("text-xl");
      expect(src).toContain("font-semibold");
      expect(src).toContain("text-foreground");
    },
  );
});

describe("문구 중복·배너 위치 (spec 070/landing-copy·notice-position)", () => {
  it("Features 제목이 Hero 킥커 문구와 겹치지 않는다", () => {
    expect(HERO).toContain("여행 계획부터 현장까지");
    expect(FEATURES).not.toContain("계획부터 현장까지");
    expect(FEATURES).toContain("여행 준비를 이렇게 돕습니다");
  });

  it("경고 배너가 최종 CTA(BottomCta) 뒤에 온다", () => {
    const cta = LANDING.indexOf("<BottomCta");
    const notice = LANDING.indexOf("<GcalTestingNotice");
    expect(cta).toBeGreaterThan(-1);
    expect(notice).toBeGreaterThan(cta);
  });
});
