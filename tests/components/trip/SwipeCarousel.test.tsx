/**
 * #657 — SwipeCarousel 계약. 이전·현재·다음 3슬라이드를 렌더하고 현재(offset 0)만
 * 접근성 트리에 노출(핍은 aria-hidden). 실제 드래그/스냅은 embla + 레이아웃이라
 * jsdom 에서 검증 불가 — 마운트·구조 계약만 본다(실기기 확인 영역).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SwipeCarousel } from "@/components/trip/SwipeCarousel";

describe("SwipeCarousel", () => {
  it("이전·현재·다음 3슬라이드를 렌더하고 핍은 aria-hidden 이다", () => {
    render(
      <SwipeCarousel
        ariaLabel="테스트 캐러셀"
        anchorKey="k0"
        onCommit={vi.fn()}
        renderSlide={(off) => <div data-testid="slide">offset:{off}</div>}
      />,
    );
    expect(
      screen.getByRole("group", { name: "테스트 캐러셀" }),
    ).toBeInTheDocument();
    // 3슬라이드 모두 렌더(핍 포함 — hidden:true).
    const slides = screen.getAllByTestId("slide");
    expect(slides).toHaveLength(3);
    // 가운데(offset 0)만 노출, 양옆은 aria-hidden 래퍼 안.
    expect(screen.getByText("offset:0")).toBeInTheDocument();
    expect(
      screen.getByText("offset:0").closest("[aria-hidden='true']"),
    ).toBeNull();
    expect(
      screen.getByText("offset:-1").closest("[aria-hidden='true']"),
    ).not.toBeNull();
  });
});
