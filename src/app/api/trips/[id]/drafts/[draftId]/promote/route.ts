/**
 * spec 027 US2 — POST /api/trips/<id>/drafts/<draftId>/promote
 *
 * draft를 정식 Activity로 승격. 필수 필드 미충족 시 422.
 * 권한: trip OWNER·HOST (헌법 VI).
 */

import type { ActivityCategory, ReservationStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAuthUserId } from "@/lib/auth-helpers";
import {
  DraftNotPromotableError,
  promoteDraft,
} from "@/lib/calendar-import/promotion";
import { userCanImportCalendar } from "@/lib/permissions/activity";

type Params = { params: Promise<{ id: string; draftId: string }> };

const CATEGORIES: ActivityCategory[] = [
  "SIGHTSEEING",
  "DINING",
  "TRANSPORT",
  "ACCOMMODATION",
  "SHOPPING",
  "OTHER",
];
const RESERVATION_STATUSES: ReservationStatus[] = [
  "REQUIRED",
  "RECOMMENDED",
  "ON_SITE",
  "NOT_NEEDED",
  "RESERVED",
];

interface PromoteRequestBody {
  category?: ActivityCategory;
  reservationStatus?: ReservationStatus;
  startTimezone?: string;
  endTimezone?: string;
  location?: string | null;
}

export async function POST(request: Request, { params }: Params) {
  const { id, draftId } = await params;
  const tripId = parseInt(id);
  const draftIdNum = parseInt(draftId);
  if (Number.isNaN(tripId) || Number.isNaN(draftIdNum)) {
    return NextResponse.json({ error: "invalid_ids" }, { status: 400 });
  }
  const userId = await getAuthUserId();
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await userCanImportCalendar(tripId, userId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: PromoteRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const missing: string[] = [];
  if (!body.category || !CATEGORIES.includes(body.category))
    missing.push("category");
  if (
    !body.reservationStatus ||
    !RESERVATION_STATUSES.includes(body.reservationStatus)
  ) {
    missing.push("reservationStatus");
  }
  if (!body.startTimezone) missing.push("startTimezone");
  if (!body.endTimezone) missing.push("endTimezone");
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: "missing_required_fields",
        message: "필수 입력 필드를 채워주세요.",
        fields: missing,
      },
      { status: 422 },
    );
  }

  try {
    const result = await promoteDraft({
      draftId: draftIdNum,
      tripId,
      category: body.category!,
      reservationStatus: body.reservationStatus!,
      startTimezone: body.startTimezone!,
      endTimezone: body.endTimezone!,
      location: body.location ?? null,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof DraftNotPromotableError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.message === "draft_not_found" ? 404 : 409 },
      );
    }
    console.error("[draft promote] internal error", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
