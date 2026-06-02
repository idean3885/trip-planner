/**
 * #627 — Apple ID 입력란 prefill 회귀 가드.
 *
 * 로그인 이메일(세션 이메일)을 Apple ID 입력란에 prefill 하면 Apple ID 와 무관한
 * 값(구글 계정 등)이 채워져 잘못된 안내가 된다. connect-apple 은 prefill 하지 않고,
 * settings/calendars 는 이미 등록된 Apple ID 만 prefill 한다. 누가 세션 이메일
 * prefill 을 다시 넣으면 이 테스트가 깨진다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../../..");
const connectSrc = readFileSync(
  resolve(ROOT, "src/app/trips/[id]/calendar/connect-apple/page.tsx"),
  "utf8",
);
const settingsSrc = readFileSync(
  resolve(ROOT, "src/app/settings/calendars/page.tsx"),
  "utf8",
);

describe("#627 Apple ID prefill", () => {
  it("connect-apple 은 세션 이메일을 prefill 하지 않는다", () => {
    expect(connectSrc).not.toMatch(/prefillEmail=\{session\.user\.email/);
  });

  it("settings/calendars 는 세션 이메일이 아닌 등록된 Apple ID 를 prefill 한다", () => {
    expect(settingsSrc).not.toMatch(/prefillEmail=\{session\.user\.email/);
    expect(settingsSrc).toMatch(/prefillEmail=\{cred\?\.appleId/);
  });
});
