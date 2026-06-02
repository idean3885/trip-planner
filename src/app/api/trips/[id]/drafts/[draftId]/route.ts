/**
 * spec 027 US3 — DELETE /api/trips/<id>/drafts/<draftId>
 *
 * draft 단건 삭제. 외부 캘린더에는 영향 없음.
 * 권한: trip OWNER·HOST.
 */

import { NextResponse } from "next/server";

import { getAuthUserId } from "@/lib/auth-helpers";
import { userCanImportCalendar } from "@/lib/permissions/activity";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; draftId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
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

  const draft = await prisma.activityDraft.findFirst({
    where: { id: draftIdNum, tripId },
    select: { id: true },
  });
  if (!draft) return new NextResponse(null, { status: 204 });

  await prisma.activityDraft.delete({ where: { id: draft.id } });
  return new NextResponse(null, { status: 204 });
}
