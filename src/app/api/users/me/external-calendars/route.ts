/**
 * spec 027 — GET /api/users/me/external-calendars
 *
 * 현재 사용자가 연결한 외부 계정의 캘린더 목록 + 진단 필드.
 * UI 캘린더 선택 모달이 본 결과로 미연결·scope 부족·필터 상태를 구분 안내.
 */

import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth-helpers";
import { listAvailableExternalCalendars } from "@/lib/calendar-import/service";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const listing = await listAvailableExternalCalendars(userId);
  return NextResponse.json(
    {
      calendars: listing.calendars,
      diagnostics: {
        unfilteredCount: listing.unfilteredCount,
        managedFilteredCount: listing.managedFilteredCount,
        notConnected: listing.notConnected,
        scopeInsufficient: listing.scopeInsufficient,
        errors: listing.errors,
      },
    },
    { status: 200 },
  );
}
