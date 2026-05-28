/**
 * spec 029 T025 — MobileSwipeShell 컴포넌트 테스트.
 *
 * default/swap 모드 전환, "뒤로" 버튼·ESC 키 동작, swap 모드일 때만 키
 * 핸들러가 활성인지 검증한다. 좌 스와이프 자체는 jsdom에서 PointerEvent
 * 시뮬레이션이 까다로워 useSwipeable 라이브러리에 위임하고, 핵심 wiring
 * (onSwapBack 호출 경로 + a11y label + ESC) 만 검증한다.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileSwipeShell } from "@/components/trip/MobileSwipeShell";

describe("MobileSwipeShell", () => {
  it("isSwapped=false 면 defaultView 만 노출, 뒤로 버튼 미노출", () => {
    render(
      <MobileSwipeShell
        isSwapped={false}
        onSwapBack={() => {}}
        defaultView={<div>default-list</div>}
        swapView={<div>swap-pane</div>}
      />,
    );
    expect(screen.getByText("default-list")).toBeInTheDocument();
    expect(screen.queryByText("swap-pane")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "기본 일정 목록으로 돌아가기" }),
    ).not.toBeInTheDocument();
  });

  it("isSwapped=true 면 swapView 와 뒤로 버튼 노출", () => {
    render(
      <MobileSwipeShell
        isSwapped={true}
        onSwapBack={() => {}}
        defaultView={<div>default-list</div>}
        swapView={<div>swap-pane</div>}
      />,
    );
    expect(screen.getByText("swap-pane")).toBeInTheDocument();
    expect(screen.queryByText("default-list")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "기본 일정 목록으로 돌아가기" }),
    ).toBeInTheDocument();
  });

  it("뒤로 버튼 클릭 시 onSwapBack 호출", () => {
    const onSwapBack = vi.fn();
    render(
      <MobileSwipeShell
        isSwapped={true}
        onSwapBack={onSwapBack}
        defaultView={<div />}
        swapView={<div>swap-pane</div>}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "기본 일정 목록으로 돌아가기" }),
    );
    expect(onSwapBack).toHaveBeenCalledTimes(1);
  });

  it("isSwapped=true 일 때 ESC 키 누르면 onSwapBack 호출", () => {
    const onSwapBack = vi.fn();
    render(
      <MobileSwipeShell
        isSwapped={true}
        onSwapBack={onSwapBack}
        defaultView={<div />}
        swapView={<div>swap-pane</div>}
      />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onSwapBack).toHaveBeenCalledTimes(1);
  });

  it("isSwapped=false 일 때 ESC 키는 onSwapBack 호출하지 않음", () => {
    const onSwapBack = vi.fn();
    render(
      <MobileSwipeShell
        isSwapped={false}
        onSwapBack={onSwapBack}
        defaultView={<div />}
        swapView={<div />}
      />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onSwapBack).not.toHaveBeenCalled();
  });
});
