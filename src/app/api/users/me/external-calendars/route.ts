/**
 * spec 027 — GET /api/users/me/external-calendars
 *
 * 현재 사용자가 연결한 외부 계정의 캘린더 목록(trip-planner 관리 캘린더 제외).
 * UI 캘린더 선택 모달이 본 결과를 보여준다.
 */

import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth-helpers";
import { listAvailableExternalCalendars } from "@/lib/calendar-import/service";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const calendars = await listAvailableExternalCalendars(userId);
  return NextResponse.json({ calendars }, { status: 200 });
}
