/**
 * spec 030 T002 — GET https://trip.idean.me/install
 *
 * install-v3.sh 의 raw 내용을 응답한다. `curl -fsSL .../install | bash` 1줄
 * 진입점. cache 는 1시간으로 잡되 Vercel 의 stale-while-revalidate 로
 * 빌드 직후에도 즉시 갱신되도록.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NextResponse } from "next/server";

const SCRIPT_PATH = join(process.cwd(), "scripts/bootstrap/install-v3.sh");
const SCRIPT_BODY = readFileSync(SCRIPT_PATH, "utf-8");

export function GET() {
  return new NextResponse(SCRIPT_BODY, {
    status: 200,
    headers: {
      "content-type": "text/x-shellscript; charset=utf-8",
      "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
