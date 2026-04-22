/**
 * spec 022 (v2.10.0) — 레거시 per-user gcal sync 엔드포인트 종료.
 *
 * 원래 기능: v2.8.0 per-user `GCalLink` 범위의 재동기화. v2.9.0 per-trip 공유 모델로
 * 대체되어 본 라우트는 v2.10.0부터 410 Gone으로 고정된다. 파일 자체는 후속
 * v2.11.0+ contract에서 삭제.
 */

import { NextResponse } from "next/server";

function gone() {
  return NextResponse.json(
    {
      error: "gone",
      message:
        "This endpoint has been retired. See spec 022 (v2.10.0 contract expand). Use POST /api/v2/trips/<id>/calendar/sync.",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } }
  );
}

export const GET = gone;
export const POST = gone;
export const PATCH = gone;
export const DELETE = gone;
