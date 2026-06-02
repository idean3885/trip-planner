/**
 * spec 030 T002 — GET https://trip.idean.me/install/oauth-listener
 *
 * scripts/bootstrap/oauth-listener.mjs 의 raw 내용을 JavaScript module 로
 * 응답. install-v3.sh 가 `curl -fsSL .../install/oauth-listener -o tmp.mjs &&
 * node tmp.mjs` 패턴으로 사용한다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NextResponse } from "next/server";

const MODULE_PATH = join(process.cwd(), "scripts/bootstrap/oauth-listener.mjs");
const MODULE_BODY = readFileSync(MODULE_PATH, "utf-8");

export function GET() {
  return new NextResponse(MODULE_BODY, {
    status: 200,
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
