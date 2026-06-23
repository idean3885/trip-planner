import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DeviceApproveCard from "@/components/DeviceApproveCard";

// spec 060 (#793) — 승인 카드: user_code 표시 + 승인/거부 → /api/auth/device/approve

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("DeviceApproveCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("user_code 를 표시하고 승인/거부 버튼을 노출한다", () => {
    render(<DeviceApproveCard userCode="ABCD-EFGH" />);
    expect(screen.getByText("ABCD-EFGH")).toBeInTheDocument();
    expect(screen.getByText("승인")).toBeInTheDocument();
    expect(screen.getByText("거부")).toBeInTheDocument();
  });

  it("승인 클릭 → approve POST 후 승인 완료 표시", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    render(<DeviceApproveCard userCode="ABCD-EFGH" />);
    fireEvent.click(screen.getByText("승인"));
    await waitFor(() =>
      expect(screen.getByText(/승인 완료/)).toBeInTheDocument(),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/auth/device/approve",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body).toEqual({ user_code: "ABCD-EFGH", decision: "approve" });
  });

  it("거부 클릭 → deny POST 후 거부 표시", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    render(<DeviceApproveCard userCode="ZZZZ-1111" />);
    fireEvent.click(screen.getByText("거부"));
    await waitFor(() =>
      expect(screen.getByText(/거부했습니다/)).toBeInTheDocument(),
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.decision).toBe("deny");
  });

  it("ok:false(만료 등) → 오류 안내", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: false }) });
    render(<DeviceApproveCard userCode="ABCD-EFGH" />);
    fireEvent.click(screen.getByText("승인"));
    await waitFor(() =>
      expect(screen.getByText(/처리하지 못했습니다/)).toBeInTheDocument(),
    );
  });
});
