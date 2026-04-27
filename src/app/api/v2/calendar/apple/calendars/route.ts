/**
 * spec 025 (#417) — Apple iCloud 캘린더 목록 조회.
 *
 * GET /api/v2/calendar/apple/calendars
 *   응답: { calendars: CalendarRef[] }
 *
 * "기존 캘린더에 추가" 옵션의 선택 목록. listCalendars는 VTODO 캘린더를 자동 필터한다
 * (POC 추가 발견 B). 401인 경우 위자드 재진입 안내.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { appleProvider } from "@/lib/calendar/provider/apple";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const cred = await prisma.appleCalendarCredential.findUnique({
    where: { userId: session.user.id },
  });
  if (!cred) {
    return NextResponse.json(
      { error: "apple_not_authenticated" },
      { status: 409 },
    );
  }

  try {
    const calendars = await appleProvider.listCalendars(session.user.id);
    return NextResponse.json({ calendars });
  } catch (e) {
    const code = appleProvider.classifyError(e);
    if (code === "auth_invalid") {
      // 401 검출 시 lastError 갱신 — 다음 hasValidAuth 호출이 즉시 false 반환
      await prisma.appleCalendarCredential.update({
        where: { userId: session.user.id },
        data: { lastError: code },
      });
      return NextResponse.json(
        { error: "auth_invalid" },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: code ?? "unknown" },
      { status: 502 },
    );
  }
}
