/**
 * spec 067 — 앱 셸 헤더는 대문(/)에서 숨기고 앱 페이지에선 렌더한다.
 */
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPath = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => mockPath() }));
vi.mock("@/components/AuthButton", () => ({
  default: () => <div data-testid="auth" />,
}));

import SiteHeader from "@/components/SiteHeader";

describe("SiteHeader 대문 숨김 (spec 067/chrome-header)", () => {
  beforeEach(() => mockPath.mockReset());

  it("대문(/)에서는 헤더를 렌더하지 않는다", () => {
    mockPath.mockReturnValue("/");
    const { container } = render(<SiteHeader />);
    expect(container.querySelector("header")).toBeNull();
  });

  it("앱 페이지(/trips)에서는 헤더를 렌더한다", () => {
    mockPath.mockReturnValue("/trips");
    const { container } = render(<SiteHeader />);
    expect(container.querySelector("header")).not.toBeNull();
  });
});
