/**
 * spec 026 묶음 B + spec 031 — trip 상세 페이지의 데스크탑 다단 분기 클래스
 * 정적 검증.
 *
 * 컴포넌트는 server async + Prisma 의존이라 mount 테스트 비용이 크다.
 * 대신 소스 파일을 직접 읽어 분기 클래스가 살아있는지 정적으로 보장.
 * 이 테스트가 깨지면 누군가 데스크탑 분기를 회귀시킨 것.
 *
 * spec 031 변경: 본문 grid 가 `minmax(0,2fr)_minmax(280px,1fr)` 비대칭에서
 * 좌·우 50:50 `lg:grid-cols-2` 로 단순화됨 (이슈 #608). 모바일은 본문 안
 * SidePanel 위치(lg:hidden) 유지, 데스크탑 SidePanel 은 우측 셀에서
 * (hidden lg:block) 노출. 두 위치 패턴은 spec 026 묶음 B 그대로 승계.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../..");
const PAGE_PATH = resolve(REPO_ROOT, "src/app/trips/[id]/page.tsx");
const SIDE_PANEL_PATH = resolve(REPO_ROOT, "src/app/trips/[id]/SidePanel.tsx");
const LAYOUT_PATH = resolve(REPO_ROOT, "src/app/layout.tsx");

const pageSrc = readFileSync(PAGE_PATH, "utf8");
const sidePanelSrc = readFileSync(SIDE_PANEL_PATH, "utf8");
const layoutSrc = readFileSync(LAYOUT_PATH, "utf8");

describe("trip 상세 데스크탑 다단 분기 (spec 026/B + spec 031)", () => {
  it("페이지 wrapper에 lg: 그리드 분기 클래스가 존재한다 — spec 031 좌·우 50:50", () => {
    // spec 031 (#608) — `minmax(0,2fr)_minmax(280px,1fr)` 비대칭 → 좌·우 균등
    // `lg:grid-cols-2` 로 단순화. 회귀 방지: 두 컬럼 분기 자체가 사라지면
    // fail. 정확한 분기 토큰은 plan 단계에서 결정되므로 둘 중 하나라도 일치.
    expect(pageSrc).toMatch(/lg:grid-cols-2|lg:grid-cols-\[minmax\(0,2fr\)/);
  });

  it("페이지가 SidePanel 컴포넌트를 사용한다", () => {
    expect(pageSrc).toContain('from "./SidePanel"');
    expect(pageSrc).toMatch(/<SidePanel\b/);
  });

  it("hotfix v2.13.1 — 모바일은 본문 안(lg:hidden) 인라인, 데스크탑은 사이드 cell(hidden lg:block)에 SidePanel 두 위치", () => {
    expect(pageSrc).toMatch(/lg:hidden[\s\S]+<SidePanel/);
    expect(pageSrc).toMatch(/hidden lg:block[\s\S]+<SidePanel/);
  });

  it("SidePanel은 캘린더 패널 3종과 MemberList를 한 컴포넌트로 묶는다", () => {
    expect(sidePanelSrc).toContain("CalendarProviderChoice");
    expect(sidePanelSrc).toContain("GCalLinkPanel");
    expect(sidePanelSrc).toContain("AppleEntryCard");
    expect(sidePanelSrc).toContain("MemberList");
  });

  it("글로벌 layout이 데스크탑에서 wide 토큰 폭으로 확장된다", () => {
    expect(layoutSrc).toMatch(/lg:max-w-wide/);
  });

  it("모바일(<lg) 흐름은 단일 컬럼 — lg prefix 없이는 grid-cols-* 지정 없음", () => {
    // 페이지 wrapper에 grid는 정의되지만 cols는 lg에서만 분기.
    // sm:/md: prefix로 grid-cols가 잡혀있지 않은지 확인 (회귀 방지).
    expect(pageSrc).not.toMatch(/(?:sm|md):grid-cols-\[/);
  });
});
