/**
 * spec 064 US3 + #894 — 대문 CTA 분기·중복 제거.
 *
 * 주의: base-ui Button은 render={<Link/>}로 앵커(href 유지)를 렌더하되
 * role="button"을 강제한다. 따라서 role="button" + href로 조회한다.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import BottomCta from "@/components/landing/BottomCta";
import Hero from "@/components/landing/Hero";
import LandingPage from "@/components/landing/LandingPage";

describe("Hero CTA (spec 064/state-cta)", () => {
  it("로그아웃: 주 CTA '시작하기' → /auth/signin?callbackUrl=/trips", () => {
    render(<Hero isLoggedIn={false} />);
    const cta = screen.getByRole("button", { name: /시작하기/ });
    expect(cta).toHaveAttribute("href", "/auth/signin?callbackUrl=/trips");
    expect(screen.queryByRole("button", { name: /여행 목록으로/ })).toBeNull();
  });

  it("로그인: 주 CTA '여행 목록으로' → /trips", () => {
    render(<Hero isLoggedIn={true} />);
    const cta = screen.getByRole("button", { name: /여행 목록으로/ });
    expect(cta).toHaveAttribute("href", "/trips");
    expect(screen.queryByRole("button", { name: /^시작하기/ })).toBeNull();
  });
});

describe("BottomCta — 비로그인 전용·크레딧 링크 제거 (#894)", () => {
  it("'시작하기' → signin primary만 렌더", () => {
    render(<BottomCta />);
    const cta = screen.getByRole("button", { name: /시작하기/ });
    expect(cta).toHaveAttribute("href", "/auth/signin?callbackUrl=/trips");
  });

  it("GitHub·프로젝트 소개 링크가 없다 (Footer로 일원화)", () => {
    render(<BottomCta />);
    expect(screen.queryByRole("button", { name: /GitHub/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /프로젝트 소개/ })).toBeNull();
  });
});

describe("대문 하단 CTA 일원화 (#894)", () => {
  it("로그인 상태에서는 하단 CTA 섹션(시작해 볼까요)이 없다", () => {
    render(<LandingPage isLoggedIn={true} />);
    expect(screen.queryByText("시작해 볼까요")).toBeNull();
  });

  it("로그아웃 상태에서는 하단 CTA 섹션이 노출된다", () => {
    render(<LandingPage isLoggedIn={false} />);
    expect(screen.getByText("시작해 볼까요")).toBeInTheDocument();
  });
});
