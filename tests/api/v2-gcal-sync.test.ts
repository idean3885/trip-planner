/**
 * spec 022 (v2.10.0) — v2 캘린더 sync 활성 코드 경로가 레거시 per-user 모델을
 * 참조하지 않는지 정적 검증.
 *
 * SC-002: "v2.10.0 활성 코드 실행 경로에 레거시 매핑 테이블 쓰기·읽기 호출이 0건".
 * 본 테스트는 src/app/ 과 src/lib/gcal/sync.ts에서 `prisma.gCalLink` / `prisma.gCalEventMapping`
 * 호출이 0건임을 grep 수준으로 확인한다. 레거시 라우트 파일은 410 핸들러로만 남으므로
 * 이들 파일에는 prisma 호출 자체가 없다.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function collectFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) collectFiles(full, out);
    else if (name.endsWith(".ts") || name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

describe("spec 022 contract — 레거시 모델 활성 참조 0건", () => {
  it("src/app·src/lib의 활성 코드에 prisma.gCalEventMapping 호출이 없다", () => {
    const scanDirs = ["src/app", "src/lib/gcal"];
    const hits: string[] = [];
    for (const d of scanDirs) {
      for (const f of collectFiles(d)) {
        const content = readFileSync(f, "utf8");
        if (/prisma\.gCalEventMapping\b/.test(content)) {
          hits.push(f);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it("src/app·src/lib의 활성 코드에 prisma.gCalLink 호출이 없다", () => {
    const scanDirs = ["src/app", "src/lib/gcal"];
    const hits: string[] = [];
    for (const d of scanDirs) {
      for (const f of collectFiles(d)) {
        const content = readFileSync(f, "utf8");
        if (/prisma\.gCalLink\b/.test(content)) {
          hits.push(f);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it("src/lib/gcal/sync.ts가 prisma.tripCalendarEventMapping을 사용한다", () => {
    const content = readFileSync("src/lib/gcal/sync.ts", "utf8");
    expect(content).toMatch(/prisma\.tripCalendarEventMapping\b/);
  });
});
