/**
 * #899 — API 문서(Scalar) 진입 정상화. Scalar는 최초 문서 로드 시 마운트되므로
 * 소프트 내비(<Link>)로는 빈 화면이 된다. 푸터·소개의 /docs 진입은 하드 내비(<a>)
 * 여야 한다(설정 화면과 동일). 소스 레벨로 <a href="/docs">를 가드한다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(REPO_ROOT, p), "utf8");

const FOOTER = read("src/components/Footer.tsx");
const ABOUT = read("src/app/about/page.tsx");
const SETTINGS = read("src/app/settings/page.tsx");

describe("API 문서 진입은 하드 내비게이션 (#899)", () => {
  it("푸터의 /docs는 <a>로 진입한다 (Link 아님)", () => {
    expect(FOOTER).toMatch(/<a\s+href="\/docs"/);
    expect(FOOTER).not.toMatch(/<Link\s+href="\/docs"/);
  });

  it("소개 화면의 /docs는 <a>로 진입한다 (Link 아님)", () => {
    expect(ABOUT).toMatch(/<a\s+href="\/docs"/);
    expect(ABOUT).not.toMatch(/<Link\s+href="\/docs"/);
  });

  it("설정 화면의 /docs는 이미 <a> (회귀 방지)", () => {
    expect(SETTINGS).toMatch(/<a\s+href="\/docs"/);
  });
});
