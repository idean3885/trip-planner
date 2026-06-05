import { describe, expect, it, vi } from "vitest";

import { main } from "../../scripts/auth-login.mjs";

// spec 059 — 범용 로그인 커맨드: 리스너 토큰을 키체인에 저장. 의존성 주입으로 테스트.
describe("auth-login main", () => {
  it("리스너가 돌려준 토큰을 저장한다", async () => {
    const storeToken = vi.fn().mockResolvedValue(undefined);
    const runListener = vi.fn().mockResolvedValue({ token: "tp_abc" });
    await main({ runListener, storeToken });
    expect(runListener).toHaveBeenCalledOnce();
    expect(storeToken).toHaveBeenCalledWith("tp_abc");
  });

  it("리스너 실패(타임아웃)를 전파하고 저장하지 않는다", async () => {
    const storeToken = vi.fn();
    const runListener = vi
      .fn()
      .mockRejectedValue({ code: 2, message: "timeout" });
    await expect(main({ runListener, storeToken })).rejects.toMatchObject({
      code: 2,
    });
    expect(storeToken).not.toHaveBeenCalled();
  });
});
