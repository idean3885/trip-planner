/**
 * spec 026 묶음 C — GCalLinkPanel 다이얼로그 데스크탑 폭 정비 정적 검증.
 *
 * DialogContent가 토큰 기반 폭(sm:max-w-narrow)으로 override되어 있는지 확인.
 * shadcn 기본 sm:max-w-sm(~384px)을 그대로 두면 데스크탑에서 모달이 좁아 정보가 잘림.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../..");
const SRC = readFileSync(
  resolve(REPO_ROOT, "src/components/GCalLinkPanel.tsx"),
  "utf8",
);

describe("GCalLinkPanel 다이얼로그 폭 (spec 026/C)", () => {
  it("모든 DialogContent에 sm:max-w-narrow override가 명시되어 있다", () => {
    const dialogOpens = SRC.match(/<DialogContent[^>]*>/g) ?? [];
    expect(dialogOpens.length).toBeGreaterThanOrEqual(5);
    for (const tag of dialogOpens) {
      expect(tag).toContain("sm:max-w-narrow");
    }
  });
});
