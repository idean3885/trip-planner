/**
 * #653 — 가로 스와이프 감지 훅. 가로 우세 + 임계 초과 제스처만 onLeft/onRight.
 * 세로 우세·임계 미달은 무시(세로 스크롤 보존).
 */
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { useHorizontalSwipe } from "@/lib/use-horizontal-swipe";

function Harness({
  onLeft,
  onRight,
}: {
  onLeft: () => void;
  onRight: () => void;
}) {
  const handlers = useHorizontalSwipe(onLeft, onRight);
  return <div data-testid="area" {...handlers} />;
}

function swipe(el: Element, fromX: number, toX: number, dy = 0) {
  fireEvent.touchStart(el, { touches: [{ clientX: fromX, clientY: 100 }] });
  fireEvent.touchEnd(el, {
    changedTouches: [{ clientX: toX, clientY: 100 + dy }],
  });
}

describe("useHorizontalSwipe", () => {
  it("왼쪽으로 쓸면 onLeft(다음)", () => {
    const onLeft = vi.fn();
    const onRight = vi.fn();
    const { getByTestId } = render(
      <Harness onLeft={onLeft} onRight={onRight} />,
    );
    swipe(getByTestId("area"), 200, 120); // dx -80
    expect(onLeft).toHaveBeenCalledOnce();
    expect(onRight).not.toHaveBeenCalled();
  });

  it("오른쪽으로 쓸면 onRight(이전)", () => {
    const onLeft = vi.fn();
    const onRight = vi.fn();
    const { getByTestId } = render(
      <Harness onLeft={onLeft} onRight={onRight} />,
    );
    swipe(getByTestId("area"), 100, 200); // dx +100
    expect(onRight).toHaveBeenCalledOnce();
    expect(onLeft).not.toHaveBeenCalled();
  });

  it("임계 미만(가로 변화 작음)은 무시한다", () => {
    const onLeft = vi.fn();
    const onRight = vi.fn();
    const { getByTestId } = render(
      <Harness onLeft={onLeft} onRight={onRight} />,
    );
    swipe(getByTestId("area"), 100, 120); // dx +20 < 40
    expect(onLeft).not.toHaveBeenCalled();
    expect(onRight).not.toHaveBeenCalled();
  });

  it("세로 우세 제스처(스크롤)는 무시한다", () => {
    const onLeft = vi.fn();
    const onRight = vi.fn();
    const { getByTestId } = render(
      <Harness onLeft={onLeft} onRight={onRight} />,
    );
    swipe(getByTestId("area"), 100, 150, 200); // dx +50, dy +200 → 세로 우세
    expect(onLeft).not.toHaveBeenCalled();
    expect(onRight).not.toHaveBeenCalled();
  });
});
