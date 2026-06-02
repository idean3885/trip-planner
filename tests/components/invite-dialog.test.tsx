/**
 * spec 041 US2 — 동행자 단일 초대 다이얼로그.
 *
 * 호스트/게스트 두 버튼을 단일 "동행자 초대"로 합치고, 다이얼로그 안에서
 * 동행자 목록 + 역할별 초대 링크 복사를 제공하는지 검증한다.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import InviteButton from "@/components/InviteButton";

describe("InviteButton 동행자 초대 다이얼로그 (spec 041)", () => {
  it("단일 '동행자 초대' 트리거를 렌더한다", () => {
    render(<InviteButton tripId={1} memberList={<div>멤버 목록</div>} />);
    expect(
      screen.getByRole("button", { name: "동행자 초대" }),
    ).toBeInTheDocument();
  });

  it("열면 동행자 목록 + 호스트/게스트 링크 복사 버튼이 함께 보인다", async () => {
    render(<InviteButton tripId={1} memberList={<div>멤버 목록</div>} />);
    fireEvent.click(screen.getByRole("button", { name: "동행자 초대" }));
    expect(await screen.findByText("멤버 목록")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "호스트 링크 복사" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "게스트 링크 복사" }),
    ).toBeInTheDocument();
  });
});
