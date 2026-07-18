/**
 * #657 — SwipeCarousel 계약. 이전·현재·다음 3슬라이드를 렌더하고 현재(offset 0)만
 * 접근성 트리에 노출(핍은 aria-hidden). 실제 드래그/스냅은 embla + 레이아웃이라
 * jsdom 에서 검증 불가 — 마운트·구조 계약만 본다(실기기 확인 영역).
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SwipeCarousel } from "@/components/trip/SwipeCarousel";

/** role=group 래퍼의 트랙(첫 자식 div)을 반환. syncHeight 가 인라인 height 를 건다. */
function trackOf(label: string): HTMLElement {
  const group = screen.getByRole("group", { name: label });
  return group.firstElementChild as HTMLElement;
}

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

  it("#956 — syncHeight 를 끄면 트랙의 인라인 height 를 비운다(월↔주 재사용 시 월 높이 잔존 방지)", () => {
    const props = {
      ariaLabel: "높이 캐러셀",
      anchorKey: "k0",
      onCommit: vi.fn(),
      renderSlide: (off: -1 | 0 | 1) => <div>offset:{off}</div>,
    } as const;
    // 월 뷰 상당 — syncHeight on 이면 트랙에 인라인 height 가 걸린다(jsdom 은 0px).
    const { rerender } = render(<SwipeCarousel {...props} syncHeight />);
    expect(trackOf("높이 캐러셀").style.height).not.toBe("");
    // 주 뷰 전환 상당 — 같은 인스턴스 재사용. 끄면 인라인 height 가 비워져야 한다.
    rerender(<SwipeCarousel {...props} />);
    expect(trackOf("높이 캐러셀").style.height).toBe("");
  });
});
