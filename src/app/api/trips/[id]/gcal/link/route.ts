/**
 * spec 022 (v2.10.0) — 레거시 per-user gcal link 엔드포인트 종료.
 *
 * 원래 기능: v2.8.0 per-user `GCalLink` 생성·해제. v2.9.0에서 per-trip 공유 모델로
 * 대체되었고, v2.10.0부터 본 라우트는 410 Gone으로 고정된다. 파일 자체는 구·신 배포
 * 인스턴스 병존 과도 구간에서 구 인스턴스 호출이 500으로 이어지지 않도록 남긴다.
 * 실제 파일 삭제는 후속 v2.11.0+ contract 릴리즈.
 */

import { NextResponse } from "next/server";

function gone() {
  return NextResponse.json(
    {
      error: "gone",
      message:
        "This endpoint has been retired. See spec 022 (v2.10.0 contract expand). Use /api/v2/trips/<id>/calendar endpoints.",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } }
  );
}

export const GET = gone;
export const POST = gone;
export const PATCH = gone;
export const DELETE = gone;
