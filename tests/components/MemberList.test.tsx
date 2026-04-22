/**
 * spec 023 — 동행자 목록 복수 뱃지.
 * `rolesFor` 순수 함수만 단위 테스트 (서버 컴포넌트 렌더는 Prisma 의존성 때문에 제외).
 */
import { describe, it, expect } from "vitest";
import { rolesFor } from "@/lib/member-role";

describe("rolesFor — spec 023 복수 뱃지", () => {
  it("OWNER → 주인 먼저, 호스트 둘째 순 2개", () => {
    const result = rolesFor("OWNER");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ key: "OWNER", label: "주인", tone: "primary" });
    expect(result[1]).toEqual({ key: "HOST", label: "호스트", tone: "secondary" });
  });

  it("HOST → 호스트 단일", () => {
    const result = rolesFor("HOST");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ key: "HOST", label: "호스트", tone: "secondary" });
  });

  it("GUEST → 게스트 단일", () => {
    const result = rolesFor("GUEST");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ key: "GUEST", label: "게스트", tone: "muted" });
  });

  it("알 수 없는 역할 → 게스트 폴백", () => {
    const result = rolesFor("UNKNOWN");
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("GUEST");
  });
});
