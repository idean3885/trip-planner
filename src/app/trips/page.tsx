import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatCalendarDateFull } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">여행 목록</h1>
        <Button nativeButton={false} render={<Link href="/trips/new" />}>
          새 여행
        </Button>
      </div>

      {/* spec 026 묶음 C — 데스크탑 ≥1024px 2열, 와이드 ≥1440px 3열. 모바일은 단일 컬럼. */}
      <div className="grid gap-grid-tight lg:grid-cols-2 lg:gap-grid-comfy xl:grid-cols-3">
        {trips.map((trip) => {
          const roleLabel =
            trip.tripMembers[0]?.role === "OWNER"
              ? "내 여행"
              : trip.tripMembers[0]?.role === "HOST"
                ? "호스트"
                : "게스트";
          const period = periodByTripId.get(trip.id);
          // _count.days > 0 면 groupBy 결과의 min/max 가 항상 채워지지만, Prisma
          // 타입은 `Date | null` 이라 옵셔널 체인을 같이 둬 타입 안전 확보.
          const hasSchedule =
            trip._count.days > 0 && period?.start && period?.end;
          return (
            <Link key={trip.id} href={`/trips/${trip.id}`} className="group block">
              <Card className="transition-all group-hover:ring-foreground/20 group-hover:-translate-y-px">
                <CardHeader>
                  <CardTitle className="text-base">{trip.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {hasSchedule ? (
                      <span className="tabular-nums">
                        {formatCalendarDateFull(period.start!)} ~{" "}
                        {formatCalendarDateFull(period.end!)}
                      </span>
                    ) : (
                      <span className="font-medium text-foreground">일정 미정</span>
                    )}
                    <span aria-hidden>·</span>
                    <span>{trip._count.days}일</span>
                    <span aria-hidden>·</span>
                    <span className="font-medium text-foreground">{roleLabel}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                    일정 보기
                    <ArrowRight className="size-3" aria-hidden />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {trips.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <p className="text-base">아직 등록된 여행이 없습니다.</p>
            <p className="mt-1 text-sm">새 여행을 만들어 보세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
