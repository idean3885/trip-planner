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
    expect(
      screen.getByRole("button", { name: "여행 정보" }),
    ).toBeInTheDocument();
  });

  it("#964 — 패널 표면을 계정 메뉴와 동일한 글래스로, 열면 등장 애니메이션을 준다", () => {
    render(
      <TripActionsMenu>
        <button>여행 정보</button>
      </TripActionsMenu>,
    );
    const panel = screen.getByRole("menu");
    // 계정 메뉴(DropdownMenuContent)와 동일 표면: glass-overlay + ring.
    expect(panel.className).toContain("glass-overlay");
    expect(panel.className).toContain("ring-1");
    // 닫힘: 애니메이션 없이 숨김.
    expect(panel.className).toContain("hidden");
    expect(panel.className).not.toContain("animate-in");
    // 열림: 등장 애니메이션.
    fireEvent.click(screen.getByRole("button", { name: "여행 메뉴" }));
    expect(panel.className).toContain("animate-in");
    expect(panel.className).toContain("zoom-in-95");
  });

  it("#967 — 자식 트리거 버튼을 flat 메뉴 항목으로 스코프한다(테두리·배경 제거·전폭 좌측 정렬)", () => {
    render(
      <TripActionsMenu>
        <button>여행 정보</button>
      </TripActionsMenu>,
    );
    const panel = screen.getByRole("menu");
    // 계정 메뉴 항목과 동일: 테두리·그림자·배경 제거, 전폭 좌측 정렬, hover=accent.
    expect(panel.className).toContain("[&>button]:border-0");
    expect(panel.className).toContain("[&>button]:bg-transparent");
    expect(panel.className).toContain("[&>button]:w-full");
    expect(panel.className).toContain("[&>button]:justify-start");
    expect(panel.className).toContain("[&>button:hover]:bg-accent");
  });
});
