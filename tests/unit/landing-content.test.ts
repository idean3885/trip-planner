import { describe, expect, it } from "vitest";

import { landingFeatures } from "@/lib/landing-content";

describe("landing-content schema (spec 064 통합)", () => {
  it("통합 소개 카드는 4개다", () => {
    expect(landingFeatures.length).toBe(4);
  });

  it("각 카드 제목은 모바일 폭에 맞는다 (<= 28자)", () => {
    for (const f of landingFeatures) {
      expect(
        f.title.length,
        `title too long: "${f.title}"`,
      ).toBeLessThanOrEqual(28);
    }
  });

  it("각 카드는 요약과 불릿 2개 이상을 가진다", () => {
    for (const f of landingFeatures) {
      expect(f.summary.trim().length).toBeGreaterThan(0);
      expect(f.bullets.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("통합 전 두 섹션의 고유 가치 항목이 모두 보존된다", () => {
    const haystack = landingFeatures
      .flatMap((f) => [f.title, f.summary, ...f.bullets])
      .join("\n");
    const uniqueMustHave = [
      "3계층", // 여행 → 날짜 → 활동 직접 관리
      "현지 시간", // 여행지 현지 시간 표시
      "Apple 여행 캘린더", // Apple 캘린더 연동
      "한 줄로 연결", // Claude에 한 줄로 연결
      "통화별", // 통화별 금액 합산
      "역할별 권한", // 동행자 역할별 권한
    ];
    for (const term of uniqueMustHave) {
      expect(haystack, `missing unique value: "${term}"`).toContain(term);
    }
  });
});
