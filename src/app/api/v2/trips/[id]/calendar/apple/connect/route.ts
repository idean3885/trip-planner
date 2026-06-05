/**
 * spec 056 (외부 캘린더 내보내기 제품 노출 제거) — Apple trip별 연결 엔드포인트 폐지.
 *
 * 여행별 Apple 공유 캘린더 연결(전용 캘린더 생성)은 내보내기(쓰기) 표면이다. 410 Gone으로
 * 고정한다. 코어(`connectAppleCalendar`)는 보존하되 미호출한다. 가져오기 읽기 인증인
 * user-level AppleCalendarCredential 등록(/settings/calendars)은 유지된다.
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
