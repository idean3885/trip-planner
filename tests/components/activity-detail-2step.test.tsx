/**
 * spec 048 — 활동 카드 탭 → 상세(읽기 전용) → 편집 2단계 + 상세 링크 팝업.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ActivityList, { type Activity } from "@/components/ActivityList";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const activity: Activity = {
  id: 1,
  category: "SIGHTSEEING",
  title: "구엘 공원",
  startTime: null,
  startTimezone: null,
  endTime: null,
  endTimezone: null,
  location: "Barcelona",
  memo: "예약 https://example.com 참고",
  cost: null,
  currency: "EUR",
  paymentTiming: "ON_SITE",
  sortOrder: 0,
};

function renderList(canEdit = true) {
  return render(
    <ActivityList tripId={1} dayId={1} activities={[activity]} canEdit={canEdit} />,
  );
}

describe("활동 카드 2단계 인터랙션 (spec 048)", () => {
  it("카드 본문 탭 → 읽기 전용 상세를 펼친다(입력칸 없는 보기, #796)", () => {
    renderList();
    fireEvent.click(screen.getByRole("button", { name: /구엘 공원 상세/ }));
    // 보기 화면 — 값은 평문으로 보이고 편집 입력칸이 없다(편집 폼과 구분).
    expect(screen.getByText("구엘 공원")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("button", { name: "편집" })).toBeInTheDocument();
  });

  it("상세의 '편집' 버튼 → 입력을 활성화한다", () => {
    renderList();
    fireEvent.click(screen.getByRole("button", { name: /구엘 공원 상세/ }));
    fireEvent.click(screen.getByRole("button", { name: "편집" }));
    const title = screen.getByLabelText(/제목/);
    expect(title).not.toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "수정" })).toBeInTheDocument();
  });

  it("상세에서 '닫기' → 카드로 복귀한다", () => {
    renderList();
    fireEvent.click(screen.getByRole("button", { name: /구엘 공원 상세/ }));
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(
      screen.getByRole("button", { name: /구엘 공원 상세/ }),
    ).toBeInTheDocument();
  });

  it("편집 권한이 없으면 상세에 편집 버튼을 노출하지 않는다", () => {
    renderList(false);
    fireEvent.click(screen.getByRole("button", { name: /구엘 공원 상세/ }));
    expect(screen.queryByRole("button", { name: "편집" })).toBeNull();
  });

  it("상세 메모의 링크는 window.open 팝업으로 연다", () => {
    const openSpy = vi
      .spyOn(window, "open")
      .mockImplementation(() => null);
    renderList();
    fireEvent.click(screen.getByRole("button", { name: /구엘 공원 상세/ }));
    fireEvent.click(screen.getByRole("link", { name: /example\.com/ }));
    expect(openSpy).toHaveBeenCalledWith(
      "https://example.com",
      "trip-link",
      expect.stringContaining("popup"),
    );
    openSpy.mockRestore();
  });
});
