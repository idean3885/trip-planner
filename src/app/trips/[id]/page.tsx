import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeDayNumber } from "@/lib/day-number";
import { formatCalendarDateFull, formatCalendarDate } from "@/lib/date-utils";
import InviteButton from "@/components/InviteButton";
import DeleteTripButton from "@/components/DeleteTripButton";
import LeaveTripButton from "@/components/LeaveTripButton";
import MemberList from "@/components/MemberList";
import GCalLinkPanel from "@/components/GCalLinkPanel";
import AppleEntryCard from "@/components/calendar/AppleEntryCard";
import CalendarProviderChoice from "@/components/calendar/CalendarProviderChoice";
import AddDayButton from "@/components/AddDayButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import html from "remark-html";

async function markdownToHtml(md: string): Promise<string> {
  const result = await remark()
    .use(remarkGfm)
    .use(html, { sanitize: false })
    .process(md);
  return result.toString();
}

// DB-정본 전환(#239) 후 이 페이지는 항상 세션 기반 동적 렌더. (#255+ 핫픽스)
export const dynamic = "force-dynamic";

export default async function TripDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ provider?: string }>;
}) {
  const { id } = await params;
  const tripId = parseInt(id);
  const sp = await searchParams;
  const providerHint = sp.provider === "google" ? "google" : null;

  if (isNaN(tripId)) notFound();
  return <DbTripPage tripId={tripId} providerHint={providerHint} />;
}

/* ── DB 기반 여행 상세 ── */

async function DbTripPage({
  tripId,
  providerHint,
}: {
  tripId: number;
  providerHint: "google" | null;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const [member, trip, calendarLink] = await Promise.all([
    prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId, userId: session.user.id } },
    }),
    prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        days: { orderBy: { date: "asc" } },
      },
    }),
    prisma.tripCalendarLink.findUnique({
      where: { tripId },
      select: { provider: true },
    }),
  ]);
  if (!member || !trip) notFound();

  const descriptionHtml = trip.description
    ? await markdownToHtml(trip.description)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          여행 목록
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">{trip.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
          {formatCalendarDateFull(trip.startDate)} ~{" "}
          {formatCalendarDateFull(trip.endDate)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {member.role !== "GUEST" && <InviteButton tripId={tripId} />}
          {member.role === "OWNER" && (
            <DeleteTripButton tripId={tripId} tripTitle={trip.title} />
          )}
          {member.role !== "OWNER" && (
            <LeaveTripButton tripId={tripId} tripTitle={trip.title} />
          )}
        </div>
      </div>

      {descriptionHtml && (
        <Card>
          <CardHeader>
            <CardTitle>여행 개요</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          </CardContent>
        </Card>
      )}

      {/* spec 024 Clarification 6: 한 trip = 1 provider · 1 외부 캘린더.
          - 미연결 + OWNER + provider 미선택 → CalendarProviderChoice (Apple 권장 + Google 안내)
          - GOOGLE 연결됨 OR providerHint=google 강제 노출 → GCalLinkPanel
          - APPLE 연결됨 → AppleEntryCard
          - 호스트/게스트 미연결 → 카드 없음 (선택권 없음) */}
      {!calendarLink && member.role === "OWNER" && !providerHint && (
        <CalendarProviderChoice tripId={tripId} />
      )}
      {(calendarLink?.provider === "GOOGLE" || providerHint === "google") && (
        <GCalLinkPanel tripId={tripId} role={member.role} />
      )}
      {calendarLink?.provider === "APPLE" && <AppleEntryCard />}

      <MemberList tripId={tripId} />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight">일정</h2>
          {member.role !== "GUEST" && (
            <AddDayButton
              tripId={tripId}
              tripStartDate={trip.startDate.toISOString()}
              tripEndDate={trip.endDate.toISOString()}
            />
          )}
        </div>
        <div className="space-y-2">
          {trip.days.map((day) => (
            <Link
              key={day.id}
              href={`/trips/${trip.id}/day/${day.id}`}
              className="group block"
            >
              <Card size="sm" className="transition-all group-hover:ring-foreground/20 group-hover:-translate-y-px">
                <CardContent className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex items-center rounded-md bg-foreground px-2 py-0.5 text-xs font-medium text-background shrink-0 tabular-nums">
                      DAY {computeDayNumber(day.date, trip.startDate)}
                    </span>
                    {day.title && (
                      <span className="text-sm text-foreground truncate">
                        {day.title}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {formatCalendarDate(day.date)}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}

          {trip.days.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              일정이 없습니다.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
