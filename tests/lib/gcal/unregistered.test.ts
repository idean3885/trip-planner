/**
 * spec 021 — 미등록 안내 상수 검증.
 */
import { describe, it, expect } from "vitest";
import {
  GCAL_DISCUSSIONS_URL,
  UNREGISTERED_NOTICE_TITLE,
  UNREGISTERED_NOTICE_BODY,
} from "@/lib/gcal/unregistered";

describe("미등록 안내 상수", () => {
  it("Discussions URL — Q&A 카테고리 + 프리필 제목·본문", () => {
    expect(GCAL_DISCUSSIONS_URL).toContain(
      "https://github.com/idean3885/trip-planner/discussions/new"
    );
    expect(GCAL_DISCUSSIONS_URL).toContain("category=q-a");
    expect(GCAL_DISCUSSIONS_URL).toContain("title=");
    expect(GCAL_DISCUSSIONS_URL).toContain("body=");
  });

  it("안내 문구 — 개발자 등록 사용자 한정 표현 유지", () => {
    expect(UNREGISTERED_NOTICE_TITLE).toMatch(/개발자 등록/);
    expect(UNREGISTERED_NOTICE_BODY).toMatch(/개발자 등록 사용자에게만 제공/);
  });
});
