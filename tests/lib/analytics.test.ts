import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * spec 057 — 분석 헬퍼 회귀 가드.
 *
 * 측정 ID 미설정 시 no-op(태그 0개와 동치), 설정 시 전송, user_id에 PII 미포함을 검증한다.
 */

const { sendGAEvent } = vi.hoisted(() => ({ sendGAEvent: vi.fn() }));
vi.mock("@next/third-parties/google", () => ({ sendGAEvent }));

import { isAnalyticsEnabled, setAnalyticsUser, track } from "@/lib/analytics";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("analytics — 측정 ID 가드", () => {
  it("측정 ID 미설정이면 비활성, track/setUser는 no-op", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "");
    expect(isAnalyticsEnabled()).toBe(false);
    track("trip_created");
    setAnalyticsUser("user-1");
    expect(sendGAEvent).not.toHaveBeenCalled();
  });

  it("측정 ID 설정 시 활성, 이벤트를 전송한다", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "G-TEST123");
    expect(isAnalyticsEnabled()).toBe(true);
    track("calendar_import", { provider: "GOOGLE" });
    expect(sendGAEvent).toHaveBeenCalledWith("event", "calendar_import", {
      provider: "GOOGLE",
    });
  });

  it("user_id에는 내부 식별자만 set한다(PII 없음)", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "G-TEST123");
    setAnalyticsUser("internal-id-123");
    expect(sendGAEvent).toHaveBeenCalledWith("set", {
      user_id: "internal-id-123",
    });
    const arg = sendGAEvent.mock.calls[0][1] as Record<string, unknown>;
    // 이메일/이름 등 PII 키가 없어야 한다.
    expect(Object.keys(arg)).toEqual(["user_id"]);
  });
});
