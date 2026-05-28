/**
 * spec 027 US3 — POST /api/trips/<id>/drafts/<draftId>/refresh
 *
 * 외부 최신 값으로 draft의 매핑 가능 필드 덮어쓰기.
 * 사용자가 입력한 timezone 등 매핑 불가 필드는 보존.
 * PROMOTED draft는 409.
 */

import { NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth-helpers";
import { userCanImportCalendar } from "@/lib/permissions/activity";
import {
  refreshDraft,
  DraftRefreshConflictError,
  ExternalAccountNotLinkedError,
  EmptyTripPeriodError,
} from "@/lib/calendar-import/service";

type Params = { params: Promise<{ id: string; draftId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id, draftId } = await params;
  const tripId = parseInt(id);
  const draftIdNum = parseInt(draftId);
  if (Number.isNaN(tripId) || Number.isNaN(draftIdNum)) {
    return NextResponse.json({ error: "invalid_ids" }, { status: 400 });
  }
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await userCanImportCalendar(tripId, userId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const result = await refreshDraft({ tripId, draftId: draftIdNum, triggeredByUserId: userId });
    if (!result.refreshed) {
      return NextResponse.json(
        { error: "external_event_missing", message: "외부에서 해당 이벤트를 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    if (err instanceof DraftRefreshConflictError) {
      return NextResponse.json({ error: "draft_not_pending" }, { status: 409 });
    }
    if (err instanceof ExternalAccountNotLinkedError) {
      return NextResponse.json(
        { error: "external_account_not_linked", settingsPath: "/settings/calendars" },
        { status: 409 },
      );
    }
    if (err instanceof EmptyTripPeriodError) {
      return NextResponse.json(
        {
          error: "empty_trip_period",
          message: "일정 0건이라 기간이 정해지지 않았습니다. 일정을 먼저 추가해 주세요.",
        },
        { status: 422 },
      );
    }
    if ((err as Error).message === "draft_not_found") {
      return NextResponse.json({ error: "draft_not_found" }, { status: 404 });
    }
    console.error("[draft refresh] internal error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
