import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TripInfoDialog } from "@/components/trip/TripInfoDialog";

// spec 063 후속 — 여행 정보(인원·설명) 보기 + 편집.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast: mockToast }));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("TripInfoDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("열면 인원과 설명을 보인다", () => {
    render(
      <TripInfoDialog
        tripId={1}
        memberCount={2}
        description="포르투갈 신혼여행"
        canEdit={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "여행 정보" }));
    expect(screen.getByText("동행자 2명")).toBeInTheDocument();
    expect(screen.getByText("포르투갈 신혼여행")).toBeInTheDocument();
  });

  it("게스트(canEdit=false)는 설명 수정 버튼이 없다", () => {
    render(
      <TripInfoDialog
        tripId={1}
        memberCount={1}
        description={null}
        canEdit={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "여행 정보" }));
    expect(screen.getByText("아직 설명이 없습니다.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "설명 수정" }),
    ).not.toBeInTheDocument();
  });

  it("편집 권한이면 설명을 수정·저장한다(PUT description)", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    render(
      <TripInfoDialog
        tripId={7}
        memberCount={2}
        description="옛 설명"
        canEdit
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "여행 정보" }));
    fireEvent.click(screen.getByRole("button", { name: "설명 수정" }));
    const textarea = screen.getByPlaceholderText(/어떤 여행인지 설명/);
    fireEvent.change(textarea, { target: { value: "새 설명" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await vi.waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/trips/7",
        expect.objectContaining({ method: "PUT" }),
      ),
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.description).toBe("새 설명");
  });
});
