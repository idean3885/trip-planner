/**
 * #894 — About 정체성 중심 축소. 설치 명령(curl) 블록·에이전트 사용법 줄글을
 * 제거하고 설치 정본(mcp/README) 링크로 대체했는지 가드한다(SSOT 이원화 방지).
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AboutPage from "@/app/about/page";

describe("About 축소 (#894)", () => {
  it("설치 curl 명령 블록이 About에 없다 (설치 정본은 mcp/README)", () => {
    const { container } = render(<AboutPage />);
    expect(container.textContent ?? "").not.toContain("curl");
    expect(container.querySelector("pre")).toBeNull();
  });

  it("설치·사용 안내(mcp/README) 링크를 제공한다", () => {
    render(<AboutPage />);
    const link = screen.getByRole("link", { name: /설치·사용 안내/ });
    expect(link).toHaveAttribute("href", expect.stringContaining("mcp/README"));
  });

  it("정체성 섹션 '왜 만들었나'가 있다", () => {
    render(<AboutPage />);
    expect(
      screen.getByRole("heading", { name: "왜 만들었나" }),
    ).toBeInTheDocument();
  });
});
