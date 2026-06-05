/**
 * spec 056 (외부 캘린더 내보내기 제품 노출 제거) — 멤버 구독/해제 엔드포인트 폐지.
 *
 * 멤버 본인 CalendarList 추가·제거는 내보내기(공유) 표면이다. 410 Gone으로 고정한다.
 * 코어(`subscribeCalendar`/`unsubscribeCalendar`)는 재도입 여지를 위해 보존하되 미호출한다.
 */

import { NextResponse } from "next/server";

function gone() {
  return NextResponse.json(
    {
      error: "gone",
      message:
        "외부 캘린더 연결/동기화는 더 이상 제공되지 않습니다. trip-planner는 외부 캘린더에서 가져오기(읽기)만 지원합니다.",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}

export const POST = gone;
export const DELETE = gone;
