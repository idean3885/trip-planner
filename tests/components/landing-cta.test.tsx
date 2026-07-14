/**
 * spec 064 US3 — 대문 Hero·BottomCta의 로그인 상태별 CTA·문구 분기.
 *
 * 주의: base-ui Button은 render={<Link/>}로 앵커(href 유지)를 렌더하되
 * role="button"을 강제한다(코드베이스 공통 패턴). 따라서 role="button" +
 * href로 조회한다.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import BottomCta from "@/components/landing/BottomCta";
import Hero from "@/components/landing/Hero";

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

describe("BottomCta CTA·문구 (spec 064/state-cta)", () => {
  it("로그아웃: '시작하기' → signin, 신규 유입 문구", () => {
    render(<BottomCta isLoggedIn={false} />);
    const cta = screen.getByRole("button", { name: /시작하기/ });
    expect(cta).toHaveAttribute("href", "/auth/signin?callbackUrl=/trips");
    expect(screen.getByText(/로그인하면 바로 여행을 만들/)).toBeInTheDocument();
  });

  it("로그인: '여행 목록으로' → /trips, 로그아웃 전제 문구 제거", () => {
    render(<BottomCta isLoggedIn={true} />);
    const cta = screen.getByRole("button", { name: /여행 목록으로/ });
    expect(cta).toHaveAttribute("href", "/trips");
    // "로그인하면" 류 로그아웃 전제 문구가 노출되지 않아야 한다
    expect(screen.queryByText(/로그인하면/)).toBeNull();
    expect(screen.getByText(/이어서 다듬어/)).toBeInTheDocument();
  });
});
