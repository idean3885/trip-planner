import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  TripsCalendar,
  type TripsCalendarTrip,
} from "@/components/trip/TripsCalendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCalendarDateFull } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

export default async function TripsIndexPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/trips");

  const trips = await prisma.trip.findMany({
    where: {
      tripMembers: { some: { userId: session.user.id } },
    },
    include: {
      _count: { select: { days: true } },
      tripMembers: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // spec 029 T040 — trip 목록 카드는 derived 기간 노출. 일정 0건은 "일정 미정".
  // N+1 회피를 위해 groupBy 1회로 trip별 min/max date 일괄 조회.
  const tripIds = trips.map((t) => t.id);
  const periods =
    tripIds.length > 0
      ? await prisma.day.groupBy({
          by: ["tripId"],
          where: { tripId: { in: tripIds } },
          _min: { date: true },
          _max: { date: true },
        })
      : [];
  const periodByTripId = new Map(
    periods.map((p) => [p.tripId, { start: p._min.date, end: p._max.date }]),
  );

  // spec 031 — 좌측 통합 캘린더에 표시할 trip 별 day.date 일괄 fetch. groupBy
  // 가 아닌 findMany 로 모든 day.date 가져온다 (trip 개수 ≤ 10 가정, 일자 ≤ 200).
  const allDays =
    tripIds.length > 0
      ? await prisma.day.findMany({
          where: { tripId: { in: tripIds } },
          select: { tripId: true, date: true },
        })
      : [];
  const datesByTripId = new Map<number, string[]>();
  for (const d of allDays) {
    const arr = datesByTripId.get(d.tripId) ?? [];
    arr.push(d.date.toISOString());
    datesByTripId.set(d.tripId, arr);
  }
  const calendarTrips: TripsCalendarTrip[] = trips.map((t) => ({
    id: t.id,
    createdAt: t.createdAt.toISOString(),
    dates: datesByTripId.get(t.id) ?? [],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">여행 목록</h1>
        <Button nativeButton={false} render={<Link href="/trips/new" />}>
          새 여행
        </Button>
      </div>

      {/* spec 031 — 데스크탑 ≥1024px 좌(통합 캘린더 50%) / 우(카드 목록 50%) 2분할.
          모바일은 캘린더 위, 카드 목록 아래 stacked. */}
      <div className="lg:gap-grid-comfy grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="lg:sticky lg:top-4">
          <TripsCalendar trips={calendarTrips} />
        </div>

        <div className="gap-grid-tight grid">
          {trips.map((trip) => {
            const roleLabel =
              trip.tripMembers[0]?.role === "OWNER"
                ? "내 여행"
                : trip.tripMembers[0]?.role === "HOST"
                  ? "호스트"
                  : "게스트";
            const period = periodByTripId.get(trip.id);
            const hasSchedule =
              trip._count.days > 0 && period?.start && period?.end;
            return (
              <Link
                key={trip.id}
                href={`/trips/${trip.id}`}
                className="group block"
              >
                <Card className="group-hover:ring-foreground/20 transition-all group-hover:-translate-y-px">
                  <CardHeader>
                    <CardTitle className="text-base">{trip.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      {hasSchedule ? (
                        <span className="tabular-nums">
                          {formatCalendarDateFull(period.start!)} ~{" "}
                          {formatCalendarDateFull(period.end!)}
                        </span>
                      ) : (
                        <span className="text-foreground font-medium">
                          일정 미정
                        </span>
                      )}
                      <span aria-hidden>·</span>
                      <span>{trip._count.days}일</span>
                      <span aria-hidden>·</span>
                      <span className="text-foreground font-medium">
                        {roleLabel}
                      </span>
                    </div>
                    <span className="text-foreground inline-flex items-center gap-1 text-xs font-medium">
                      일정 보기
                      <ArrowRight className="size-3" aria-hidden />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}

          {trips.length === 0 && (
            <div className="text-muted-foreground py-16 text-center">
              <p className="text-base">아직 등록된 여행이 없습니다.</p>
              <p className="mt-1 text-sm">새 여행을 만들어 보세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
