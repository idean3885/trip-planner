/**
 * spec 030 T004 — oauth-listener 단위 테스트.
 *
 * 실제 listener 를 띄우고 fetch 로 callback 을 가짜로 보내
 * state/timeout/invalid_token 경로를 검증.
 */

import { describe, it, expect } from "vitest";
import { runOAuthListener } from "../../scripts/bootstrap/oauth-listener.mjs";

interface ListenerResult {
  token: string;
}

interface ListenerRejection {
  code: number;
  message: string;
}

interface WithListenerOpts {
  timeoutSec?: number;
  onOpen?: (info: { port: number; state: string }) => void | Promise<void>;
}

function withListener(opts: WithListenerOpts = {}): Promise<ListenerResult> {
  const open = (url: string) => {
    const u = new URL(url);
    const port = Number(u.searchParams.get("port"));
    const state = u.searchParams.get("state") ?? "";
    setTimeout(() => opts.onOpen?.({ port, state }), 0);
  };
  return runOAuthListener({
    baseUrl: "http://localhost",
    timeoutSec: opts.timeoutSec ?? 5,
    open,
  }) as Promise<ListenerResult>;
}

describe("oauth-listener", () => {
  it("resolves with token when valid callback received", async () => {
    const result = await withListener({
      onOpen: async ({ port, state }) => {
        const url = `http://127.0.0.1:${port}/token?token=tp_${"a".repeat(64)}&state=${state}`;
        await fetch(url, { method: "POST" });
      },
    });
    expect(result.token.startsWith("tp_")).toBe(true);
  });

  it("rejects code=3 on state mismatch", async () => {
    await expect(
      withListener({
        onOpen: async ({ port }) => {
          const url = `http://127.0.0.1:${port}/token?token=tp_${"b".repeat(64)}&state=wrong`;
          await fetch(url, { method: "POST" });
        },
      }),
    ).rejects.toMatchObject({ code: 3 } satisfies Partial<ListenerRejection>);
  });

  it("rejects code=1 on invalid token format", async () => {
    await expect(
      withListener({
        onOpen: async ({ port, state }) => {
          const url = `http://127.0.0.1:${port}/token?token=NOT_PT&state=${state}`;
          await fetch(url, { method: "POST" });
        },
      }),
    ).rejects.toMatchObject({ code: 1 } satisfies Partial<ListenerRejection>);
  });

  it("rejects code=2 on timeout", async () => {
    await expect(
      withListener({ timeoutSec: 1, onOpen: () => {} }),
    ).rejects.toMatchObject({ code: 2 } satisfies Partial<ListenerRejection>);
  });
});
