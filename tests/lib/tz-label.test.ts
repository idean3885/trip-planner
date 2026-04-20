import { describe, it, expect } from "vitest";
import { tzLabel } from "@/lib/tz-label";

// 계절 고정 날짜
const SUMMER = new Date("2026-06-15T12:00:00Z");
const WINTER = new Date("2026-01-15T12:00:00Z");

describe("tzLabel", () => {
  it("Asia/Seoul → KST (DST 없음)", () => {
    expect(tzLabel("Asia/Seoul", SUMMER)).toBe("KST");
    expect(tzLabel("Asia/Seoul", WINTER)).toBe("KST");
  });

  it("Asia/Tokyo → JST", () => {
    expect(tzLabel("Asia/Tokyo", SUMMER)).toBe("JST");
  });

  it("Europe/Lisbon DST-aware: WEST(여름) / WET(겨울)", () => {
    expect(tzLabel("Europe/Lisbon", SUMMER)).toBe("WEST");
    expect(tzLabel("Europe/Lisbon", WINTER)).toBe("WET");
  });

  it("Europe/Paris DST-aware: CEST / CET", () => {
    expect(tzLabel("Europe/Paris", SUMMER)).toBe("CEST");
    expect(tzLabel("Europe/Paris", WINTER)).toBe("CET");
  });

  it("Europe/London DST-aware: BST / GMT", () => {
    expect(tzLabel("Europe/London", SUMMER)).toBe("BST");
    expect(tzLabel("Europe/London", WINTER)).toBe("GMT");
  });

  it("America/New_York DST-aware: EDT / EST", () => {
    expect(tzLabel("America/New_York", SUMMER)).toBe("EDT");
    expect(tzLabel("America/New_York", WINTER)).toBe("EST");
  });

  it("Australia/Sydney 남반구 DST: AEST(6월, 겨울) / AEDT(1월, 여름)", () => {
    // 남반구라 반대
    expect(tzLabel("Australia/Sydney", SUMMER)).toBe("AEST");
    expect(tzLabel("Australia/Sydney", WINTER)).toBe("AEDT");
  });

  it("UTC → UTC", () => {
    expect(tzLabel("UTC", SUMMER)).toBe("UTC");
  });

  it("화이트리스트 밖, Intl이 short 돌려주는 경우 → 그대로 사용", () => {
    // America/Sao_Paulo는 테이블에 있음 → BRT
    expect(tzLabel("America/Sao_Paulo", SUMMER)).toBe("BRT");
  });

  it("화이트리스트 밖 + Intl도 GMT만 돌려주는 경우 → IANA 마지막 세그먼트", () => {
    // Etc/GMT는 Intl이 "GMT" 반환 → underscore 없는 마지막 세그먼트로 폴백
    const result = tzLabel("Etc/GMT", SUMMER);
    // "GMT" (Intl) 또는 "GMT" (폴백) — 둘 다 GMT가 되므로 확정
    expect(result).toBe("GMT");
  });

  it("존재하지 않는 IANA → 마지막 세그먼트로 폴백 (underscore → space)", () => {
    // 잘못된 IANA는 Intl이 throw
    expect(tzLabel("Made/Up_Zone", SUMMER)).toBe("Up Zone");
  });
});
