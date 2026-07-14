/**
 * spec 064 US2 — 로그인 후 여행 목록으로 이동.
 * signin/page.tsx는 서버 컴포넌트라 소스 레벨로 목적지 규칙을 가드한다:
 * callbackUrl 우선, 미지정 시 기본값 /trips (이전 "/" 아님).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(__dirname, "../..");
const SIGNIN = readFileSync(
  resolve(REPO_ROOT, "src/app/auth/signin/page.tsx"),
  "utf8",
);

describe("로그인 목적지 (spec 064/login-destination)", () => {
  it("기본 목적지가 /trips다 (callbackUrl 우선)", () => {
    expect(SIGNIN).toMatch(
      /redirectTo\s*=\s*callbackUrl\s*\|\|\s*["']\/trips["']/,
    );
  });

  it("기본 목적지가 대문(/)으로 남아 있지 않다", () => {
    expect(SIGNIN).not.toMatch(
      /redirectTo\s*=\s*callbackUrl\s*\|\|\s*["']\/["']/,
    );
  });

  it("signIn 호출이 redirectTo를 사용한다", () => {
    expect(SIGNIN).toMatch(
      /signIn\(\s*["']google["']\s*,\s*\{\s*redirectTo\s*\}/,
    );
  });
});
