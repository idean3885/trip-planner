import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatCalendarDateFull } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">우리의 여행</h1>
        <Button nativeButton={false} render={<Link href="/trips/new" />}>
          새 여행
        </Button>
      </div>

      <div className="space-y-3">
        {trips.map((trip) => {
          const roleLabel =
            trip.tripMembers[0]?.role === "OWNER"
              ? "내 여행"
              : trip.tripMembers[0]?.role === "HOST"
                ? "호스트"
                : "게스트";
          return (
            <Link key={trip.id} href={`/trips/${trip.id}`} className="group block">
              <Card className="transition-all group-hover:ring-foreground/20 group-hover:-translate-y-px">
                <CardHeader>
                  <CardTitle className="text-base">{trip.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {trip.startDate && trip.endDate && (
                      <span className="tabular-nums">
                        {formatCalendarDateFull(trip.startDate)} ~{" "}
                        {formatCalendarDateFull(trip.endDate)}
                      </span>
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
