/**
 * spec 022 (v2.10.0) — 레거시 per-user gcal status 엔드포인트 종료.
 *
 * 원래 기능: per-user 연결 상태 조회 + v2.9.0에서 공유 모델 어댑터 역할.
 * spec 020에서 per-user 폴백 제거 이후 v2.10.0부터 본 라우트는 410 Gone으로 고정.
 * 파일 자체는 후속 v2.11.0+ contract에서 삭제.
 */

import { NextResponse } from "next/server";

function gone() {
  return NextResponse.json(
    {
      error: "gone",
      message:
        "This endpoint has been retired. See spec 022 (v2.10.0 contract expand). Use GET /api/v2/trips/<id>/calendar.",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } }
  );
}

export const GET = gone;
export const POST = gone;
export const PATCH = gone;
export const DELETE = gone;
