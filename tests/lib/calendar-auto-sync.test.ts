/**
 * spec 049 — 활동 변경 후 외부 캘린더 자동 반영 헬퍼.
 *
 * 기존 syncCalendar 를 재사용하되, 미연결(404)·실패를 삼켜 변경 응답에 영향이
 * 없도록 한다. 연결된 경우엔 caller/tripUrl 로 syncCalendar 를 호출한다.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockSyncCalendar } = vi.hoisted(() => ({ mockSyncCalendar: vi.fn() }));
vi.mock("@/lib/calendar/service", () => ({ syncCalendar: mockSyncCalendar }));

import { triggerCalendarAutoSync } from "@/lib/calendar/auto-sync";

describe("triggerCalendarAutoSync", () => {
  beforeEach(() => vi.clearAllMocks());

  it("연결된 경우 caller/tripUrl 로 syncCalendar 를 호출한다", async () => {
    mockSyncCalendar.mockResolvedValue({ status: 200, body: {} });
    await triggerCalendarAutoSync(1, "u1", "http://x/trips/1");
    expect(mockSyncCalendar).toHaveBeenCalledWith(
      { userId: "u1", tripId: 1 },
      { tripUrl: "http://x/trips/1" },
    );
  });

  it("미연결(404)이어도 예외를 던지지 않고 로그도 남기지 않는다", async () => {
    mockSyncCalendar.mockResolvedValue({
      status: 404,
      body: { error: "not_linked" },
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      triggerCalendarAutoSync(1, "u1", "http://x/trips/1"),
    ).resolves.toBeUndefined();
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("동기화 예외를 삼킨다(변경 응답 무영향)", async () => {
    mockSyncCalendar.mockRejectedValue(new Error("boom"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      triggerCalendarAutoSync(1, "u1", "http://x/trips/1"),
    ).resolves.toBeUndefined();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("미연결·권한 외 실패(5xx)는 로그를 남긴다", async () => {
    mockSyncCalendar.mockResolvedValue({ status: 500, body: {} });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await triggerCalendarAutoSync(1, "u1", "http://x/trips/1");
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
