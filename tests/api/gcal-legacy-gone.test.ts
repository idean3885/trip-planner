/**
 * spec 022 (v2.10.0) — 레거시 per-user gcal 라우트 3종이 410 Gone 반환.
 *
 * 대체 경로: /api/v2/trips/<id>/calendar* (공유 모델 기반).
 */
import { describe, it, expect } from "vitest";

import { GET as linkGet, POST as linkPost, DELETE as linkDelete } from "@/app/api/trips/[id]/gcal/link/route";
import { GET as syncGet, PATCH as syncPatch } from "@/app/api/trips/[id]/gcal/sync/route";
import { GET as statusGet } from "@/app/api/trips/[id]/gcal/status/route";

async function assertGone(res: Response) {
  expect(res.status).toBe(410);
  expect(res.headers.get("Cache-Control")).toBe("no-store");
  const body = await res.json();
  expect(body.error).toBe("gone");
  expect(body.message).toMatch(/retired/i);
}

describe("legacy gcal routes — 410 Gone (spec 022)", () => {
  it("GET /api/trips/<id>/gcal/link → 410", async () => {
    await assertGone(linkGet());
  });

  it("POST /api/trips/<id>/gcal/link → 410", async () => {
    await assertGone(linkPost());
  });

  it("DELETE /api/trips/<id>/gcal/link → 410", async () => {
    await assertGone(linkDelete());
  });

  it("GET /api/trips/<id>/gcal/sync → 410", async () => {
    await assertGone(syncGet());
  });

  it("PATCH /api/trips/<id>/gcal/sync → 410", async () => {
    await assertGone(syncPatch());
  });

  it("GET /api/trips/<id>/gcal/status → 410", async () => {
    await assertGone(statusGet());
  });
});
