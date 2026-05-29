/**
 * spec 033 — DraftSection 선택·일괄 보정·일괄 확정.
 *
 * 진입 시 전체 선택, 전체 토글, 시간 미정 일괄/타임존 일괄, 확정 시 promote-batch
 * 로 선택분 전송을 검증한다. 표시 시각은 부동 시간(getUTC*) 기준(헌법 VII).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DraftSection from "@/components/calendar-sync/sections/DraftSection";

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast: mockToast }));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const DRAFTS = [
  {
    id: 1,
    tripId: 1,
    provider: "GOOGLE",
    externalCalendarId: "c1",
    externalEventId: "e1",
    title: "리스본 도착",
    startTime: "2026-06-07T09:00:00.000Z",
    endTime: "2026-06-07T11:00:00.000Z",
    isAllDay: false,
    locationText: "Lisbon",
    description: null,
    startTimezone: "Europe/Lisbon",
    endTimezone: "Europe/Lisbon",
    status: "PENDING",
  },
  {
    id: 2,
    tripId: 1,
    provider: "GOOGLE",
    externalCalendarId: "c1",
    externalEventId: "e2",
    title: "호텔 체크인",
    startTime: "2026-06-07T00:00:00.000Z",
    endTime: "2026-06-08T00:00:00.000Z",
    isAllDay: true,
    locationText: null,
    description: null,
    startTimezone: null,
    endTimezone: null,
    status: "PENDING",
  },
];

function mockDraftsThenBatch() {
  mockFetch.mockImplementation((url: string, opts?: { method?: string }) => {
    if (typeof url === "string" && url.includes("/drafts?status=PENDING")) {
      return Promise.resolve({ ok: true, json: async () => ({ drafts: DRAFTS }) });
    }
    if (typeof url === "string" && url.includes("/promote-batch") && opts?.method === "POST") {
      return Promise.resolve({
        ok: true,
        json: async () => ({ promoted: [{ draftId: 1, activityId: 10 }], failed: [] }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

describe("DraftSection (spec 033)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDraftsThenBatch();
  });

  it("진입 시 draft 를 렌더하고 전체 선택한다", async () => {
    render(<DraftSection tripId={1} canEdit onMutated={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("리스본 도착")).toBeInTheDocument());
    expect(screen.getByText("호텔 체크인")).toBeInTheDocument();
    // 전체 선택 표시 2/2
    expect(screen.getByText(/전체 선택 \(2\/2\)/)).toBeInTheDocument();
    // 부동 시간 표시 — 09:00 (getUTCHours 기준)
    expect(screen.getByText(/09:00/)).toBeInTheDocument();
  });

  it("확정 버튼은 선택 수를 표시하고, 클릭 시 promote-batch 로 선택분을 보낸다", async () => {
    const onMutated = vi.fn();
    render(<DraftSection tripId={1} canEdit onMutated={onMutated} />);
    await waitFor(() => expect(screen.getByText("리스본 도착")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /2건 가져오기/ }));

    await waitFor(() =>
      expect(
        mockFetch.mock.calls.some(
          ([url, opts]) =>
            typeof url === "string" &&
            url.includes("/promote-batch") &&
            opts?.method === "POST",
        ),
      ).toBe(true),
    );
    const batchCall = mockFetch.mock.calls.find(
      ([url]) => typeof url === "string" && url.includes("/promote-batch"),
    );
    const body = JSON.parse(batchCall![1].body);
    expect(body.items).toHaveLength(2);
    expect(body.items[0].category).toBe("SIGHTSEEING"); // 기본값
    await waitFor(() => expect(onMutated).toHaveBeenCalled());
  });

  it("전체 선택을 끄면 확정 버튼이 비활성화된다", async () => {
    render(<DraftSection tripId={1} canEdit onMutated={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("리스본 도착")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText(/전체 선택/));
    expect(screen.getByText(/0건 가져오기/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /0건 가져오기/ })).toBeDisabled();
  });

  it("지역 표시 일괄은 '기록' 어휘 + 시각 불변 안내를 노출한다(#637 부동 시간 프레이밍)", async () => {
    render(<DraftSection tripId={1} canEdit onMutated={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("리스본 도착")).toBeInTheDocument());
    // "적용"이 아니라 "기록" — 변환이 아니라 어느 지역 시간인지 기록.
    expect(screen.getByRole("button", { name: "기록" })).toBeInTheDocument();
    // 라벨은 "지역 표시", 시각 불변 안내 노출.
    expect(screen.getByText("지역 표시")).toBeInTheDocument();
    expect(screen.getByText(/시각은 그대로 둡니다/)).toBeInTheDocument();
  });

  it("지역 표시 기록은 표시 시각 숫자를 바꾸지 않는다(헌법 VII)", async () => {
    render(<DraftSection tripId={1} canEdit onMutated={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("리스본 도착")).toBeInTheDocument());
    expect(screen.getByText(/09:00/)).toBeInTheDocument(); // 기록 전
    fireEvent.click(screen.getByRole("button", { name: "기록" }));
    // 기록 후에도 벽시계 숫자 그대로(09:00) — 환산 없음.
    expect(screen.getByText(/09:00/)).toBeInTheDocument();
    expect(mockToast.success).toHaveBeenCalledWith(
      expect.stringContaining("지역 시간으로 기록"),
    );
  });

  it("종일(시간 미정) draft 항목 컨테이너가 가로 넘침 방지 클래스를 쓴다", async () => {
    const { container } = render(<DraftSection tripId={1} canEdit onMutated={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("호텔 체크인")).toBeInTheDocument());
    // 항목 내부 flex-wrap + min-w-0 (모바일 가로 스크롤 방지)
    expect(container.querySelector(".flex-wrap.min-w-0, .min-w-0.flex-wrap")).not.toBeNull();
  });
});
