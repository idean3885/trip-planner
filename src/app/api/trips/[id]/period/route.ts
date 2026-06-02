import { NextResponse } from "next/server";

import { canEdit, getAuthUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getDerivedPeriodTx } from "@/lib/trip-period";

type Params = { params: Promise<{ id: string }> };

/** "YYYY-MM-DD" → UTC 자정 Date. 형식 위반·무효 날짜는 null. */
function parseYmd(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * spec 043 US1 — 여행 기간 직접 편집.
 *
 * 기간은 Day 의 min/max 에서 파생되므로(명목 컬럼 없음, spec 029) 기간을
 * [start, end] 로 맞춘다는 것은: (1) 범위 밖 Day 삭제(cascade 활동), (2) 경계
 * 날짜(start/end)에 Day 가 없으면 생성, 이다. 삭제될 Day 에 활동이 있으면
 * `confirm` 없이는 409 로 막고 삭제 대상 요약만 돌려준다(손실 방지). 삭제될
 * 활동이 없거나 `confirm:true` 면 즉시 적용한다.
 */
export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const tripId = parseInt(id);
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await canEdit(tripId, userId))) {
    return NextResponse.json({ error: "편집 권한이 없습니다" }, { status: 403 });
  }

  const body = await request.json();
  const start = parseYmd(body.startDate);
  const end = parseYmd(body.endDate);
  const confirm = body.confirm === true;

  if (!start || !end) {
    return NextResponse.json(
      { error: "시작일과 종료일이 필요합니다" },
      { status: 400 },
    );
  }
  if (start.getTime() > end.getTime()) {
    return NextResponse.json(
      { error: "시작일이 종료일보다 늦을 수 없습니다" },
      { status: 400 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const days = await tx.day.findMany({
      where: { tripId },
      select: {
        id: true,
        date: true,
        title: true,
        _count: { select: { activities: true } },
      },
    });

    const outOfRange = days.filter(
      (d) =>
        d.date.getTime() < start.getTime() || d.date.getTime() > end.getTime(),
    );
    const lossDays = outOfRange.filter((d) => d._count.activities > 0);

    // 삭제될 일자에 활동이 있고 확인 전이면 — 아무것도 바꾸지 않고 요약만 반환.
    if (!confirm && lossDays.length > 0) {
      return {
        status: "confirm_required" as const,
        dayCount: outOfRange.length,
        totalActivities: lossDays.reduce(
          (sum, d) => sum + d._count.activities,
          0,
        ),
        wouldDelete: lossDays.map((d) => ({
          date: d.date.toISOString(),
          title: d.title,
          activityCount: d._count.activities,
        })),
      };
    }

    if (outOfRange.length > 0) {
      await tx.day.deleteMany({
        where: { tripId, OR: [{ date: { lt: start } }, { date: { gt: end } }] },
      });
    }

    // 경계(start/end) 날짜에 Day 가 없으면 생성 — min/max 가 곧 기간이므로.
    const inRange = days.filter(
      (d) =>
        d.date.getTime() >= start.getTime() &&
        d.date.getTime() <= end.getTime(),
    );
    if (!inRange.some((d) => d.date.getTime() === start.getTime())) {
      await tx.day.create({ data: { tripId, date: start } });
    }
    if (
      end.getTime() !== start.getTime() &&
      !inRange.some((d) => d.date.getTime() === end.getTime())
    ) {
      await tx.day.create({ data: { tripId, date: end } });
    }

    const derived = await getDerivedPeriodTx(tx, tripId);
    return {
      status: "ok" as const,
      startDate: derived.startDate?.toISOString() ?? null,
      endDate: derived.endDate?.toISOString() ?? null,
    };
  });

  if (result.status === "confirm_required") {
    return NextResponse.json(result, { status: 409 });
  }
  return NextResponse.json(result);
}
