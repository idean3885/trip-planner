/**
 * #743 — POST /api/trips/<id>/days/batch-delete
 *
 * 여러 일자를 한 요청으로 삭제한다. 일자 삭제는 그 안의 활동을 함께 제거한다
 * (cascade). 단건 삭제는 그대로 유지하고 배치는 추가(additive). 여행 경계 안에
 * 실제 존재하는 식별자만 삭제하고, 나머지는 건너뜀(skipped)으로 반환한다(부분
 * 성공). 활동을 함께 제거하므로 외부 캘린더 자동 반영을 요청당 한 번 수행한다.
 * 권한: trip 편집 권한(canEdit, 헌법 VI).
 *
 * 라우트 우선순위: 정적 세그먼트 `batch-delete` 가 동적 `[dayId]` 보다 먼저
 * 매칭되어 `/days/batch-delete` 가 본 핸들러로 라우팅된다.
 */

import { after, NextResponse } from "next/server";

import { getAppOrigin } from "@/lib/app-url";
import { canEdit, getAuthUserId } from "@/lib/auth-helpers";
import { triggerCalendarAutoSync } from "@/lib/calendar/auto-sync";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

interface BatchBody {
  ids?: unknown;
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const tripId = parseInt(id);
  if (Number.isNaN(tripId)) {
    return NextResponse.json({ error: "invalid_trip_id" }, { status: 400 });
  }

  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await canEdit(tripId, userId))) {
    return NextResponse.json({ error: "편집 권한이 없습니다" }, { status: 403 });
  }

  let body: BatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const requested = Array.isArray(body.ids)
    ? Array.from(
        new Set(body.ids.filter((x): x is number => Number.isInteger(x))),
      )
    : [];
  if (requested.length === 0) {
    return NextResponse.json({ error: "empty_ids" }, { status: 400 });
  }

  // 여행 경계 안에 실제 존재하는 일자만 삭제 대상으로 추린다(부분 성공·경계 보호).
  const existing = await prisma.day.findMany({
    where: { id: { in: requested }, tripId },
    select: { id: true },
  });
  const deleted = existing.map((d) => d.id);
  const skipped = requested.filter((rid) => !deleted.includes(rid));

  if (deleted.length > 0) {
    // 일자 삭제 → 소속 활동 cascade 제거(schema onDelete: Cascade).
    await prisma.day.deleteMany({
      where: { id: { in: deleted }, tripId },
    });
    // spec 049 — 활동이 함께 제거되므로 외부 캘린더 자동 반영(요청당 한 번).
    const tripUrl = `${getAppOrigin(request)}/trips/${tripId}`;
    after(() => triggerCalendarAutoSync(tripId, userId, tripUrl));
  }

  return NextResponse.json({ deleted, skipped });
}
