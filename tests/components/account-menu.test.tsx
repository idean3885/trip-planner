/**
 * spec 069 — 헤더 계정 메뉴. flat 링크+뷰포트 분기 대신 단일 계정 메뉴로 전환.
 * #948 — 메뉴를 실제로 열어 콘텐츠 마운트 크래시(render={Link} 회귀)를 가드한다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { email: "test@example.com", name: "테스터" } },
  }),
  signOut: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
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
    expect(screen.queryByText("로그아웃")).not.toBeInTheDocument();
  });

  it("트리거를 누르면 메뉴가 열려 설정·로그아웃이 마운트된다(크래시 없음)", () => {
    render(<AuthButton />);
    fireEvent.click(screen.getByRole("button", { name: "계정 메뉴" }));
    expect(screen.getByText("설정")).toBeInTheDocument();
    expect(screen.getByText("로그아웃")).toBeInTheDocument();
  });

  it("설정 항목은 render={Link} 대신 onClick 라우팅을 쓴다(#948 크래시 회귀)", () => {
    expect(SRC).not.toMatch(/DropdownMenuItem\s+render=/);
    expect(SRC).toContain('router.push("/settings")');
  });

  it("뷰포트 분기(hidden sm:)를 쓰지 않는다(단일 반응형)", () => {
    expect(SRC).not.toContain("hidden sm:");
    expect(SRC).not.toContain("sm:inline-block");
  });
});
