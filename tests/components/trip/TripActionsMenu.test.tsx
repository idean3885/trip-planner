import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TripActionsMenu } from "@/components/trip/TripActionsMenu";

// spec 063 후속 — 우상단 햄버거(☰) 드롭다운으로 동작을 모은다.

describe("TripActionsMenu", () => {
  it("☰ 클릭으로 패널을 열고 닫는다", () => {
    render(
      <TripActionsMenu>
        <button>여행 정보</button>
      </TripActionsMenu>,
    );
    const toggle = screen.getByRole("button", { name: "여행 메뉴" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("Esc 로 패널을 닫는다", () => {
    render(
      <TripActionsMenu>
        <button>여행 정보</button>
      </TripActionsMenu>,
    );
    const toggle = screen.getByRole("button", { name: "여행 메뉴" });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("항목(children)은 항상 마운트된다(열린 다이얼로그 보존)", () => {
    render(
      <TripActionsMenu>
        <button>여행 정보</button>
      </TripActionsMenu>,
    );
    // 닫힌 상태에서도 항목은 DOM 에 존재한다(표시만 토글).
    expect(screen.getByRole("button", { name: "여행 정보" })).toBeInTheDocument();
  });
});
