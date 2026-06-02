// scripts/audit-tokens.ts
// 스펙 013 FR-004 / contracts/legacy-removal.md "토큰 정합성 스크립트" 계약 구현.
//
// design/tokens.json(정본) ↔ src/app/globals.css @theme(빌드 산출물) ↔ src/**
// 사용처의 3계층 정합을 검증한다.
//
// Exit codes:
//   0 — 고아·그림자 토큰 0건
//   2 — 정합 위반 발견

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const TOKENS_PATH = resolve(REPO_ROOT, "design/tokens.json");
const CSS_PATH = resolve(REPO_ROOT, "src/app/globals.css");
const SRC_DIR = resolve(REPO_ROOT, "src");

const BEGIN_MARKER = "/* BEGIN:tokens";
const END_MARKER = "/* END:tokens */";

type DtcgNode = { [key: string]: unknown };

function isLeaf(node: unknown): node is { $value: unknown } {
  return typeof node === "object" && node !== null && "$value" in node;
}

function flatten(
  node: unknown,
  prefix: string[],
  out: Record<string, string>,
): void {
  if (isLeaf(node)) {
    out[prefix.join("-")] = String(node.$value);
    return;
  }
  if (typeof node !== "object" || node === null) return;
  for (const [k, v] of Object.entries(node as DtcgNode)) {
    if (k.startsWith("$") || k.startsWith("_")) continue;
    flatten(v, prefix.concat(k), out);
  }
}

function readTokensDefinitive(): Set<string> {
  const raw = readFileSync(TOKENS_PATH, "utf8");
  const parsed: DtcgNode = JSON.parse(raw);
  const flat: Record<string, string> = {};
  for (const [cat, node] of Object.entries(parsed)) {
    if (cat.startsWith("$") || cat.startsWith("_")) continue;
    flatten(node, [cat], flat);
  }
  return new Set(Object.keys(flat));
}

function readThemeNames(): Set<string> {
  const css = readFileSync(CSS_PATH, "utf8");
  const beginIdx = css.indexOf(BEGIN_MARKER);
  const endIdx = css.indexOf(END_MARKER);
  if (beginIdx === -1 || endIdx === -1) {
    console.error(
      `ERROR: BEGIN:tokens/END:tokens 마커를 찾지 못함 (${CSS_PATH})`,
    );
    process.exit(2);
  }
  const block = css.slice(beginIdx, endIdx);
  const names = new Set<string>();
  for (const match of block.matchAll(/--([a-z][a-z0-9-]*):/g)) {
    names.add(match[1]!);
  }
  return names;
}

function* walkTsSources(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".") || entry === "node_modules") continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) yield* walkTsSources(full);
    else if (
      entry.endsWith(".ts") ||
      entry.endsWith(".tsx") ||
      entry.endsWith(".css")
    )
      yield full;
  }
}

function readUsedNames(): Set<string> {
  const used = new Set<string>();
  for (const file of walkTsSources(SRC_DIR)) {
    const content = readFileSync(file, "utf8");
    for (const match of content.matchAll(/var\(--([a-z][a-z0-9-]*)\)/g)) {
      used.add(match[1]!);
    }
    for (const match of content.matchAll(/--([a-z][a-z0-9-]*):/g)) {
      used.add(match[1]!);
    }
  }
  return used;
}

// spec 055 — Figma 디자인 색 정본은 globals.css `:root`(SD 정본 tokens.json 의
// 반응형/간격 스코프 밖, design/tokens.json _allowlist 위임 규칙). 디자인 등장
// 프리미티브 팔레트와 캘린더 상태 토큰이 실수로 빠지면 화면이 무채색으로 회귀하므로,
// :root 선언 존재를 별도로 가드한다. 값 비교는 하지 않고 선언 존재만 검사한다.
const REQUIRED_ROOT_TOKENS: readonly string[] = [
  // 프리미티브 팔레트 (디자인 등장 색 전수)
  "white",
  "gray-50",
  "gray-100",
  "gray-200",
  "gray-300",
  "gray-600",
  "gray-700",
  "gray-800",
  "gray-900",
  "gray-950",
  "black",
  "blue-500",
  "blue-700",
  "green-50",
  "green-600",
  "green-800",
  "pink-400",
  // 캘린더 셀/헤더 상태
  "cal-saturday",
  "cal-sunday",
  "cal-weekday-header",
  "cal-trip-weekend",
  "cal-trip-weekend-dark",
  "cal-selected-bg",
  "cal-selected-text",
  "cal-today-border",
  "cal-inactive",
  "cal-inactive-strong",
  "cal-weekend-inactive",
  "cal-fill-weekend",
  "cal-fill-weekday",
  // 동행 배너
  "banner",
  "banner-foreground",
];

/** globals.css 전체에서 선언된 CSS 변수명(--name:) 집합. */
function readDeclaredVars(): Set<string> {
  const css = readFileSync(CSS_PATH, "utf8");
  const names = new Set<string>();
  for (const match of css.matchAll(/--([a-z][a-z0-9-]*)\s*:/g)) {
    names.add(match[1]!);
  }
  return names;
}

function main(): void {
  const definitive = readTokensDefinitive();
  const theme = readThemeNames();
  const used = readUsedNames();
  // spec 055 — :root 팔레트·캘린더 토큰 선언 누락 검사.
  const declaredVars = readDeclaredVars();
  const missingPalette = REQUIRED_ROOT_TOKENS.filter(
    (t) => !declaredVars.has(t),
  );

  // 1. 정본 → @theme: 정본의 모든 토큰이 @theme에 존재해야 함 (빌더 결정성)
  const missingInTheme: string[] = [];
  for (const name of definitive) {
    if (!theme.has(name)) missingInTheme.push(name);
  }

  // 2. @theme → 정본: @theme의 모든 토큰이 정본에 있거나 빈 블록이어야 함
  //    (shadcn semantic 토큰은 :root에 있고 @theme에는 inline 참조만.
  //     BEGIN:tokens/END:tokens 사이는 전적으로 정본 소유)
  const shadowInTheme: string[] = [];
  for (const name of theme) {
    if (!definitive.has(name)) shadowInTheme.push(name);
  }

  // 3. 정본 고아 토큰: 정본에 있지만 `used`(src/ 전역)에서 언급되지 않는 경우
  //    디자인 토큰은 Tailwind 유틸리티 네이밍 규칙상 --color-foo-bar → bg-foo-bar
  //    등으로 변형 사용될 수도 있어, 완전한 고아 검출은 별개 단계. 본 감사는
  //    "정본 선언은 있으나 빌드 산출물에 없는" 케이스만 에러로 취급.

  console.log("=== 토큰 3계층 감사 ===");
  console.log(`- 정본 토큰: ${definitive.size}개`);
  console.log(`- @theme 블록 토큰: ${theme.size}개`);
  console.log(`- 사용처 참조 이름: ${used.size}개 (--name: 또는 var(--name))`);
  console.log(
    `- :root 디자인 팔레트·캘린더 토큰: ${REQUIRED_ROOT_TOKENS.length - missingPalette.length}/${REQUIRED_ROOT_TOKENS.length}개 선언`,
  );

  if (
    missingInTheme.length === 0 &&
    shadowInTheme.length === 0 &&
    missingPalette.length === 0
  ) {
    console.log("✓ 정본 ↔ @theme 결정적 일치 (양방향 diff 0)");
    console.log("✓ :root Figma 팔레트·캘린더 토큰 전수 선언 (spec 055)");
    if (definitive.size === 0) {
      console.log(
        "  ℹ 정본이 비어 있음 — Phase 2 중성 상태(디자이너 합류 전). 예상된 상태.",
      );
    }
    process.exit(0);
  }

  if (missingPalette.length > 0) {
    console.error(
      `FAIL: :root 에 누락된 Figma 팔레트·캘린더 토큰 ${missingPalette.length}건 (무채색 회귀 위험)`,
    );
    for (const n of missingPalette) console.error(`  - --${n}`);
    console.error("→ src/app/globals.css :root 에 토큰 선언 복원 (spec 055)");
  }

  if (missingInTheme.length > 0) {
    console.error(
      `FAIL: 정본에 있으나 @theme에 없는 토큰 ${missingInTheme.length}건 (빌드 누락)`,
    );
    for (const n of missingInTheme) console.error(`  - ${n}`);
    console.error("→ `npm run tokens:build` 재실행 후 커밋");
  }

  if (shadowInTheme.length > 0) {
    console.error(
      `FAIL: @theme에 있으나 정본에 없는 토큰 ${shadowInTheme.length}건 (수동 편집 흔적)`,
    );
    for (const n of shadowInTheme) console.error(`  - ${n}`);
    console.error("→ design/tokens.json에 추가하거나 @theme에서 제거");
  }

  process.exit(2);
}

main();
