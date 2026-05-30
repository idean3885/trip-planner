/**
 * spec 026 묶음 B + spec 031 → spec 032 — trip 상세 페이지 레이아웃 정적 검증.
 *
 * 컴포넌트는 server async + Prisma 의존이라 mount 비용이 크다. 소스 파일을
 * 직접 읽어 핵심 분기/배치가 살아있는지 정적으로 보장한다.
 *
 * spec 032 변경:
 * - SidePanel(동기화+동행자 묶음) 해체 → page.tsx 가 CalendarSyncEntryCard·
 *   MemberList 를 직접 만들어 TripDetailLayout 의 syncCard·memberList prop 으로
 *   전달. 좌우/세로 배치는 TripDetailLayout 이 viewport 별로 처리.
 * - 데스크탑 2분할 grid 가 page.tsx → TripDetailLayout 으로 이동(lg:grid-cols-2).
 * - Day 상세 페이지(/trips/[id]/day/[dayId])는 redirect 로 축소.
 * - DayList 제거.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../..");
const PAGE_PATH = resolve(REPO_ROOT, "src/app/trips/[id]/page.tsx");
const LAYOUT_COMPONENT_PATH = resolve(
  REPO_ROOT,
  "src/components/trip/TripDetailLayout.tsx",
);
const DAY_PAGE_PATH = resolve(REPO_ROOT, "src/app/trips/[id]/day/[dayId]/page.tsx");
const GLOBAL_LAYOUT_PATH = resolve(REPO_ROOT, "src/app/layout.tsx");

const pageSrc = readFileSync(PAGE_PATH, "utf8");
const layoutComponentSrc = readFileSync(LAYOUT_COMPONENT_PATH, "utf8");
const dayPageSrc = readFileSync(DAY_PAGE_PATH, "utf8");
const globalLayoutSrc = readFileSync(GLOBAL_LAYOUT_PATH, "utf8");

describe("trip 상세 레이아웃 (spec 032 — 캘린더 중심 단일 화면)", () => {
  it("page.tsx 는 해체된 SidePanel 을 더 이상 import 하지 않는다", () => {
    expect(pageSrc).not.toMatch(/from "\.\/SidePanel"/);
  });

  it("page.tsx 는 동기화 카드·동행자를 직접 만들어 TripDetailLayout 에 prop 으로 넘긴다", () => {
    expect(pageSrc).toContain("CalendarSyncEntryCard");
    expect(pageSrc).toContain("MemberList");
    expect(pageSrc).toMatch(/<TripDetailLayout[\s\S]+syncCard=/);
    expect(pageSrc).toMatch(/<TripDetailLayout[\s\S]+memberList=/);
  });

  it("데스크탑 2분할 grid 는 TripDetailLayout 으로 이동했다 — lg:grid-cols-2", () => {
    // spec 031 까지 page.tsx 본문 wrapper 에 있던 lg:grid-cols-2 가
    // TripDetailLayout 내부 데스크탑 분기로 이동. 좌(캘린더+동기화)/우(동행자+일정).
    expect(layoutComponentSrc).toContain("lg:grid-cols-2");
    expect(pageSrc).not.toMatch(/lg:grid-cols-2/);
  });

  it("TripDetailLayout 은 캘린더 확대(desktopFull)와 모바일 압축(enableMobileCompact)을 쓴다", () => {
    expect(layoutComponentSrc).toContain("desktopFull");
    expect(layoutComponentSrc).toContain("enableMobileCompact");
  });

  it("TripDetailLayout 은 모바일에서 캘린더를 sticky 로 고정한다", () => {
    expect(layoutComponentSrc).toMatch(/sticky top-0/);
  });

  it("DayList 가 제거됐다 — TripDetailLayout 에 DayList 정의·참조가 없다", () => {
    expect(layoutComponentSrc).not.toMatch(/DayList/);
  });

  it("Day 상세 페이지는 redirect 로 축소됐다", () => {
    expect(dayPageSrc).toContain('from "next/navigation"');
    expect(dayPageSrc).toMatch(/redirect\(`\/trips\/\$\{id\}`\)/);
    // 더 이상 ActivityList 를 직접 렌더하지 않는다(인라인 패널로 이동).
    expect(dayPageSrc).not.toContain("ActivityList");
  });

  it("모바일(<lg) 흐름은 단일 컬럼 — sm/md prefix grid-cols 분기 없음", () => {
    expect(pageSrc).not.toMatch(/(?:sm|md):grid-cols-/);
    expect(layoutComponentSrc).not.toMatch(/(?:sm|md):grid-cols-/);
  });

  it("글로벌 layout 이 데스크탑에서 wide 토큰 폭으로 확장된다", () => {
    expect(globalLayoutSrc).toMatch(/lg:max-w-wide/);
  });

  it("헤더 로고는 좁은 화면에서 짓눌리지 않게 shrink-0 + whitespace-nowrap 을 쓴다(#641)", () => {
    // 13 mini(375px) 에서 로고가 한 글자씩 세로로 접히던 회귀 가드.
    expect(globalLayoutSrc).toMatch(/shrink-0 whitespace-nowrap/);
  });

  it("AuthButton 이메일은 sm 미만에서 숨겨 헤더 가로 넘침을 막는다(#641)", () => {
    const authSrc = readFileSync(
      resolve(REPO_ROOT, "src/components/AuthButton.tsx"),
      "utf8",
    );
    expect(authSrc).toMatch(/hidden[^"]*sm:inline-block/);
  });

  it("모바일 '자세히'는 펼침이 아니라 Dialog + TripDetailExtras 로 연다(#645)", () => {
    expect(layoutComponentSrc).toContain("TripDetailExtras");
    expect(layoutComponentSrc).toContain("DialogTrigger");
    expect(layoutComponentSrc).toContain("DialogContent");
  });

  it("데스크탑 월간 캘린더는 셀 크기를 키워 폭을 더 채운다(#645)", () => {
    const calSrc = readFileSync(
      resolve(REPO_ROOT, "src/components/trip/CalendarView.tsx"),
      "utf8",
    );
    // desktopFull 셀 크기가 기존 10 보다 큰 14 로 상향.
    expect(calSrc).toMatch(/desktopFull &&[^;]*--cell-size:--spacing\(14\)/);
  });

  it("캘린더에 세로 스크롤을 막는 touch-action 제약이 없다(#649 치명 회귀 제거)", () => {
    const calSrc = readFileSync(
      resolve(REPO_ROOT, "src/components/trip/CalendarView.tsx"),
      "utf8",
    );
    // touch-pan-x 가 sticky 캘린더 위 페이지 스크롤을 막던 회귀 제거. 재유입 가드.
    expect(calSrc).not.toMatch(/touch-pan-x/);
  });
});
