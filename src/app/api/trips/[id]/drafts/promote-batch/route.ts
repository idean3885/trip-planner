/**
 * spec 033 — POST /api/trips/<id>/drafts/promote-batch
 *
 * 선택된 draft 들을 보정값과 함께 일괄 승격한다. 항목별로 promoteDraft 를
 * 호출하고 부분 성공을 허용한다(실패 항목은 건너뛰고 결과에 모아 반환).
 * startTime/endTime 은 클라이언트 미리보기에서 보정한 부동 시간(헌법 VII).
 * 권한: trip OWNER·HOST (헌법 VI).
 */

import type { ActivityCategory } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAuthUserId } from "@/lib/auth-helpers";
import {
  DraftNotPromotableError,
  promoteDraft,
} from "@/lib/calendar-import/promotion";
import { userCanImportCalendar } from "@/lib/permissions/activity";

type Params = { params: Promise<{ id: string }> };

const CATEGORIES: ActivityCategory[] = [
  "SIGHTSEEING",
  "DINING",
  "TRANSPORT",
  "ACCOMMODATION",
  "SHOPPING",
  "OTHER",
];
interface BatchItem {
  draftId?: number;
  category?: ActivityCategory;
  startTimezone?: string;
  endTimezone?: string;
  /** 보정된 부동 시각(ISO). 없으면 draft 원본 사용. */
  startTime?: string;
  endTime?: string;
  location?: string | null;
}

interface BatchBody {
  items?: BatchItem[];
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const tripId = parseInt(id);
  if (Number.isNaN(tripId)) {
    return NextResponse.json({ error: "invalid_ids" }, { status: 400 });
  }
  const userId = await getAuthUserId();
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await userCanImportCalendar(tripId, userId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: BatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const items = body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "empty_items" }, { status: 400 });
  }

  const promoted: { draftId: number; activityId: number }[] = [];
  const failed: { draftId: number | null; error: string }[] = [];

  for (const item of items) {
    if (typeof item.draftId !== "number") {
      failed.push({ draftId: null, error: "invalid_draft_id" });
      continue;
    }
    if (
      !item.category ||
      !CATEGORIES.includes(item.category) ||
      !item.startTimezone ||
      !item.endTimezone
    ) {
      failed.push({ draftId: item.draftId, error: "missing_required_fields" });
      continue;
    }
    try {
      const result = await promoteDraft({
        draftId: item.draftId,
        tripId,
        category: item.category,
        startTimezone: item.startTimezone,
        endTimezone: item.endTimezone,
        location: item.location ?? null,
        startTime: item.startTime ? new Date(item.startTime) : undefined,
        endTime: item.endTime ? new Date(item.endTime) : undefined,
      });
      promoted.push({ draftId: item.draftId, activityId: result.activityId });
    } catch (err) {
      const message =
        err instanceof DraftNotPromotableError ? err.message : "internal_error";
      if (!(err instanceof DraftNotPromotableError)) {
        console.error("[draft promote-batch] internal error", err);
      }
      failed.push({ draftId: item.draftId, error: message });
    }
  }

  return NextResponse.json({ promoted, failed }, { status: 200 });
}
