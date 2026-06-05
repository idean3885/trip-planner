import { describe, expect, it } from "vitest";

import { POST as APPLE_POST } from "@/app/api/v2/trips/[id]/calendar/apple/connect/route";
/**
 * spec 056 — 외부 캘린더 쓰기/동기화 공개 엔드포인트 410 Gone 폐지 검증.
 *
 * 연결/해제/상태·sync·apple connect·subscribe 엔드포인트가 410을 반환하고,
 * 응답 본문에 폐지 안내(error: "gone")가 담기는지 확인한다(FR-007, SC-004).
 */
import { DELETE, GET, POST } from "@/app/api/v2/trips/[id]/calendar/route";
import {
  DELETE as SUB_DELETE,
  POST as SUB_POST,
} from "@/app/api/v2/trips/[id]/calendar/subscribe/route";
import { POST as SYNC_POST } from "@/app/api/v2/trips/[id]/calendar/sync/route";

async function expectGone(res: Response) {
  expect(res.status).toBe(410);
  const body = await res.json();
  expect(body.error).toBe("gone");
  expect(typeof body.message).toBe("string");
}

describe("spec 056 — export/sync 엔드포인트 410 Gone", () => {
  it("연결(POST /calendar)은 410", async () => {
    await expectGone(POST());
  });
  it("연결 해제(DELETE /calendar)은 410", async () => {
    await expectGone(DELETE());
  });
  it("상태 조회(GET /calendar)은 410", async () => {
    await expectGone(GET());
  });
  it("sync(POST /calendar/sync)은 410", async () => {
    await expectGone(SYNC_POST());
  });
  it("Apple 연결(POST /calendar/apple/connect)은 410", async () => {
    await expectGone(APPLE_POST());
  });
  it("멤버 구독(POST /calendar/subscribe)은 410", async () => {
    await expectGone(SUB_POST());
  });
  it("멤버 구독 해제(DELETE /calendar/subscribe)은 410", async () => {
    await expectGone(SUB_DELETE());
  });
});
