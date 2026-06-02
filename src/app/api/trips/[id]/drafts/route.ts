/**
 * spec 027 — GET /api/trips/<id>/drafts
 *
 * trip의 ActivityDraft 목록. status 쿼리(기본 PENDING).
 * 권한: trip 멤버 누구나(조회).
 */

import type { ActivityDraftStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAuthUserId, getTripMember } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const ALLOWED_STATUSES: ActivityDraftStatus[] = [
  "PENDING",
  "PROMOTED",
  "DELETED",
];

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const tripId = parseInt(id);
  if (Number.isNaN(tripId)) {
    return NextResponse.json({ error: "invalid_trip_id" }, { status: 400 });
  }
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const member = await getTripMember(tripId, userId);
  if (!member) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const status: ActivityDraftStatus = ALLOWED_STATUSES.includes(
    statusParam as ActivityDraftStatus,
  )
    ? (statusParam as ActivityDraftStatus)
    : "PENDING";

  const drafts = await prisma.activityDraft.findMany({
    where: { tripId, status },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json({ drafts }, { status: 200 });
}
