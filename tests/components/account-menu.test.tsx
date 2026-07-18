/**
 * spec 069 — 헤더 계정 메뉴. flat 링크+뷰포트 분기 대신 단일 계정 메뉴로 전환.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { email: "test@example.com", name: "테스터" } },
  }),
  signOut: vi.fn(),
}));

import AuthButton from "@/components/AuthButton";

const SRC = readFileSync(
  resolve(__dirname, "../../src/components/AuthButton.tsx"),
  "utf8",
);

describe("헤더 계정 메뉴 (spec 069/account-menu)", () => {
  it("계정 트리거 버튼 하나를 렌더한다(항목은 접힘)", () => {
    render(<AuthButton />);
    expect(
      screen.getByRole("button", { name: "계정 메뉴" }),
    ).toBeInTheDocument();
    // 닫힌 상태 — 설정/로그아웃 항목은 아직 DOM에 펼쳐져 있지 않다.
    expect(screen.queryByText("로그아웃")).not.toBeInTheDocument();
  });

  it("DropdownMenu 기반이고 이메일·설정·로그아웃을 포함한다", () => {
    expect(SRC).toContain("DropdownMenu");
    expect(SRC).toContain("설정");
    expect(SRC).toContain("로그아웃");
    expect(SRC).toContain("signOut");
    expect(SRC).toContain("DropdownMenuLabel");
  });

  it("뷰포트 분기(hidden sm:)를 쓰지 않는다(단일 반응형)", () => {
    expect(SRC).not.toContain("hidden sm:");
    expect(SRC).not.toContain("sm:inline-block");
  });
});
