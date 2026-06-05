/**
 * spec 056 (외부 캘린더 내보내기 제품 노출 제거) — sync 엔드포인트 폐지.
 *
 * trip-planner는 외부 캘린더에 쓰지 않고 가져오기(읽기)만 지원한다(SSOT 단방향).
 * 활동→외부 캘린더 sync는 410 Gone으로 고정한다. sync 코어(`syncCalendar`)는
 * 재도입 여지를 위해 보존하되 제품 표면에서 호출되지 않는다. 레거시 gcal/sync
 * (spec 022) 410 패턴을 준용한다.
 */

import { NextResponse } from "next/server";

function gone() {
  return NextResponse.json(
    {
      error: "gone",
      message:
        "외부 캘린더 내보내기/동기화는 더 이상 제공되지 않습니다. trip-planner는 외부 캘린더에서 가져오기(읽기)만 지원합니다.",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}

export const POST = gone;
