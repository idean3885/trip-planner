import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeDayNumber } from "@/lib/day-number";
import { getResolvedPeriod } from "@/lib/trip-period";
import { formatCalendarDateFull } from "@/lib/date-utils";
import InviteButton from "@/components/InviteButton";
import DeleteTripButton from "@/components/DeleteTripButton";
import LeaveTripButton from "@/components/LeaveTripButton";
import AddDayButton from "@/components/AddDayButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SidePanel from "./SidePanel";
import {
  TripDetailLayout,
  type LayoutActivity,
  type LayoutDay,
} from "@/components/trip/TripDetailLayout";
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
        days: {
          orderBy: { date: "asc" },
          include: {
            activities: { orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }] },
          },
        },
      },
    }),
    prisma.tripCalendarLink.findUnique({
      where: { tripId },
      select: { provider: true, calendarName: true },
    }),
  ]);
  if (!member || !trip) notFound();

  const period = await getResolvedPeriod(tripId, {
    startDate: trip.startDate,
    endDate: trip.endDate,
  });

  const layoutDays: LayoutDay[] = trip.days.map((d) => ({
    id: d.id,
    date: d.date.toISOString(),
    title: d.title,
    dayNumber: computeDayNumber(d.date, period.startDate),
    activities: d.activities.map<LayoutActivity>((a) => ({
      id: a.id,
      title: a.title,
      category: a.category,
      startTime: a.startTime ? a.startTime.toISOString() : null,
      endTime: a.endTime ? a.endTime.toISOString() : null,
      location: a.location,
      reservationStatus: a.reservationStatus,
    })),
  }));

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

      {/* spec 026 묶음 B — 데스크탑 ≥1024px에서 본문(2/3) + 사이드(1/3) 다단.
          모바일(<1024px)에서는 grid가 단일 컬럼처럼 동작해 회귀 없음. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] lg:gap-grid-comfy lg:items-start">
        <div className="space-y-6 min-w-0">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{trip.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
              {formatCalendarDateFull(period.startDate)} ~{" "}
              {formatCalendarDateFull(period.endDate)}
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

          {/* spec 026 hotfix v2.13.1 — 모바일에서는 캘린더·멤버 패널을 본문 흐름 안(개요 ~ 일정 사이)에 둔다.
              v2.12.x 위치를 회복. 데스크탑에서는 우측 사이드 cell에서 노출(아래 lg:block). */}
          <div className="lg:hidden space-y-6">
            <SidePanel
              tripId={tripId}
              role={member.role}
              hasCalendarLink={Boolean(calendarLink)}
              calendarProvider={calendarLink?.provider ?? null}
              calendarName={calendarLink?.calendarName ?? null}
              providerHint={providerHint}
            />
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold tracking-tight">일정</h2>
              {member.role !== "GUEST" && (
                <AddDayButton
                  tripId={tripId}
                  tripStartDate={period.startDate.toISOString()}
                  tripEndDate={period.endDate.toISOString()}
                />
              )}
            </div>
            <TripDetailLayout
              tripId={tripId}
              tripStart={period.startDate}
              tripEnd={period.endDate}
              days={layoutDays}
              canEdit={member.role !== "GUEST"}
            />
          </section>
        </div>

        <div className="hidden lg:block">
          <SidePanel
            tripId={tripId}
            role={member.role}
            hasCalendarLink={Boolean(calendarLink)}
            calendarProvider={calendarLink?.provider ?? null}
            calendarName={calendarLink?.calendarName ?? null}
            providerHint={providerHint}
          />
        </div>
      </div>
    </div>
  );
}
