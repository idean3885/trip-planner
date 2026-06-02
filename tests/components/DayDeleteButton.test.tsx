/**
 * #734 — 액션바 "일자 삭제" 버튼 스타일.
 *
 * 다른 액션 버튼과 같은 외곽선(outline) 스타일을 쓰고(혼자 ghost 로 튀지 않게),
 * 삭제 의미는 글자색(text-destructive 토큰)으로만 구분한다. ghost 회귀 가드.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DayDeleteButton from "@/components/DayDeleteButton";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe("DayDeleteButton 스타일 (#734)", () => {
  it("외곽선(outline) 스타일 + 삭제 글자색을 쓴다", () => {
    render(<DayDeleteButton tripId={1} dayId={1} />);
    const btn = screen.getByRole("button", { name: /일자 삭제/ });
    // outline variant 의 테두리 토큰 — ghost(테두리 없음) 회귀를 막는다.
    expect(btn.className).toContain("border-border");
    // 삭제 의미는 디자인 토큰 글자색으로만 구분.
    expect(btn.className).toContain("text-destructive");
  });
});
