import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import EmptyTripsGuide from "@/components/trip/EmptyTripsGuide";
import { ExpenseSummary } from "@/components/trip/ExpenseSummary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCalendarDateFull } from "@/lib/date-utils";
import { convertToKrw, summarize } from "@/lib/expense";
import { getRatesForPairs } from "@/lib/fx/rates";
import { prisma } from "@/lib/prisma";

/** Date → UTC 기준 "YYYY-MM-DD" (근사 환율 맵 키와 동일 규칙). */
function ymdUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function TripsIndexPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/trips");

  const trips = await prisma.trip.findMany({
    where: {
      tripMembers: { some: { userId: session.user.id } },
    },
    include: {
      // spec 063 — 인원수(전체 동행자) + 일수.
      _count: { select: { days: true, tripMembers: true } },
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

  // spec 063 — trip별 사용 금액. 활동을 1쿼리로 일괄 조회 → trip별 그룹핑,
  // 환율은 배치(캐시 우선)로 확보해 원화 근사 병기. (N+1 회피)
  const activities =
    tripIds.length > 0
      ? await prisma.activity.findMany({
          where: { day: { tripId: { in: tripIds } } },
          select: {
            cost: true,
            currency: true,
            paymentTiming: true,
            day: { select: { tripId: true, date: true } },
          },
        })
      : [];
  const rateMap = await getRatesForPairs(
    activities.map((a) => ({ base: a.currency, date: a.day.date })),
  );
  const byTrip = new Map<
    number,
    {
      cost: string | null;
      currency: string;
      paymentTiming: (typeof activities)[number]["paymentTiming"];
      dateYmd: string;
    }[]
  >();
  for (const a of activities) {
    const list = byTrip.get(a.day.tripId) ?? [];
    list.push({
      cost: a.cost ? a.cost.toString() : null,
      currency: a.currency,
      paymentTiming: a.paymentTiming,
      dateYmd: ymdUTC(a.day.date),
    });
    byTrip.set(a.day.tripId, list);
  }
  const spendByTripId = new Map(
    [...byTrip.entries()].map(([id, items]) => [
      id,
      { rows: summarize(items), krw: convertToKrw(items, rateMap) },
    ]),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">여행 목록</h1>
        <Button nativeButton={false} render={<Link href="/trips/new" />}>
          새 여행
        </Button>
      </div>

      {/* spec 039 — 홈은 여행 목록 카드만 단일 컬럼으로 나열 (통합 캘린더 제거). */}
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
          const spend = spendByTripId.get(trip.id);
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
                    <span>{trip._count.tripMembers}명</span>
                    <span aria-hidden>·</span>
                    <span className="text-foreground font-medium">
                      {roleLabel}
                    </span>
                  </div>
                  {/* spec 063 — 사용 금액(현화/원화 참고). 지출 0이면 생략. */}
                  {spend && spend.rows.length > 0 && (
                    <ExpenseSummary
                      rows={spend.rows}
                      label="사용 금액"
                      krw={spend.krw}
                    />
                  )}
                  <span className="text-foreground inline-flex items-center gap-1 text-xs font-medium">
                    일정 보기
                    <ArrowRight className="size-3" aria-hidden />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {trips.length === 0 && <EmptyTripsGuide />}
      </div>
    </div>
  );
}
