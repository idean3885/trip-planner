/**
 * spec 056 (외부 캘린더 내보내기 제품 노출 제거) — 연결/해제/상태 엔드포인트 폐지.
 *
 * 외부 캘린더 연결(전용 캘린더 생성+ACL)·해제·상태 조회는 내보내기(쓰기) 표면이다.
 * trip-planner는 가져오기(읽기)만 지원하므로 410 Gone으로 고정한다. 코어(`connectCalendar`/
 * `disconnectCalendar`/`getCalendarStatus`)는 재도입 여지를 위해 보존하되 미호출한다.
 * 가져오기에 필요한 외부 캘린더 계정 연결 상태는 GET /api/users/me/external-calendars로 조회한다.
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
export const GET = gone;
