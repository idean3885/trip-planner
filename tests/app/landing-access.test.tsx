/**
 * spec 064 US1 — 로그인 사용자도 대문을 본다.
 * page.tsx는 서버 컴포넌트(async, auth())라 렌더 대신 소스 레벨로
 * "로그인 시 /trips 강제 리다이렉트 제거 + isLoggedIn 전파"를 가드한다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(__dirname, "../..");
const PAGE = readFileSync(resolve(REPO_ROOT, "src/app/page.tsx"), "utf8");
const LAYOUT = readFileSync(resolve(REPO_ROOT, "src/app/layout.tsx"), "utf8");

describe("대문 접근 (spec 064/landing-access)", () => {
  it("로그인 시 /trips 강제 리다이렉트가 없다", () => {
    expect(PAGE).not.toMatch(/redirect\(\s*["']\/trips["']\s*\)/);
    expect(PAGE).not.toContain('from "next/navigation"');
  });

  it("세션 로그인 여부를 LandingPage에 isLoggedIn으로 전달한다", () => {
    expect(PAGE).toMatch(
      /const\s+isLoggedIn\s*=\s*Boolean\(session\?\.user\?\.id\)/,
    );
    expect(PAGE).toMatch(/<LandingPage\s+isLoggedIn=\{isLoggedIn\}\s*\/>/);
  });

  it("상단 로고는 대문(/)을 가리킨다", () => {
    expect(LAYOUT).toMatch(/href="\/"[^>]*>[\s\S]*?우리의 여행/);
  });
});
