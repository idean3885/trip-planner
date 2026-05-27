/**
 * spec 027 — POST /api/trips/<id>/calendar-import
 *
 * 외부 캘린더의 trip 기간 이벤트를 ActivityDraft로 import한다.
 * 권한: trip의 OWNER 또는 HOST. GUEST는 403.
 * 외부 계정 미연결 시 409.
 * 멱등성: (provider, externalCalendarId, externalEventId) 키로 중복 차단.
 */

import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth-helpers";
import { userCanImportCalendar } from "@/lib/permissions/activity";
import {
  runImport,
  ExternalAccountNotLinkedError,
} from "@/lib/calendar-import/service";
import type { CalendarProviderId } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

interface ImportRequestBody {
  provider?: CalendarProviderId;
  externalCalendarId?: string;
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const tripId = parseInt(id);
  if (Number.isNaN(tripId)) {
    return NextResponse.json({ error: "invalid_trip_id" }, { status: 400 });
  }

  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await userCanImportCalendar(tripId, userId))) {
    return NextResponse.json(
      { error: "forbidden", message: "외부 캘린더 import는 HOST 이상에게만 허용됩니다." },
      { status: 403 },
    );
  }

  let body: ImportRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.provider || !body.externalCalendarId) {
    return NextResponse.json(
      { error: "missing_fields", fields: ["provider", "externalCalendarId"] },
      { status: 400 },
    );
  }

  try {
    const result = await runImport({
      tripId,
      triggeredByUserId: userId,
      provider: body.provider,
      externalCalendarId: body.externalCalendarId,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof ExternalAccountNotLinkedError) {
      return NextResponse.json(
        {
          error: "external_account_not_linked",
          message: "캘린더 계정을 먼저 연결하세요.",
          settingsPath: `/trips/${tripId}/calendar/connect-apple`,
        },
        { status: 409 },
      );
    }
    console.error("[calendar-import] internal error", err);
    return NextResponse.json(
      { error: "internal_error" },
      { status: 500 },
    );
  }
}
