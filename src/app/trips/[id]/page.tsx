import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import html from "remark-html";

import { auth } from "@/auth";
import AddDayButton from "@/components/AddDayButton";
import CalendarSyncEntryCard from "@/components/calendar-sync/CalendarSyncEntryCard";
import DeleteTripButton from "@/components/DeleteTripButton";
import InviteButton from "@/components/InviteButton";
import LeaveTripButton from "@/components/LeaveTripButton";
import MemberList from "@/components/MemberList";
import {
  type LayoutActivity,
  type LayoutDayIndex,
  TripDetailLayout,
} from "@/components/trip/TripDetailLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACTIVITY_WINDOW_RADIUS, windowYmds } from "@/lib/activity-window";
import { formatCalendarDateFull } from "@/lib/date-utils";
import { computeDayNumber } from "@/lib/day-number";
import { prisma } from "@/lib/prisma";
import { getResolvedPeriod } from "@/lib/trip-period";

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
    // #669 — 인덱스만(활동 제외). 활동은 선택일 윈도우만 따로 받는다.
    prisma.trip.findUnique({
      where: { id: tripId },
      include: { days: { orderBy: { date: "asc" } } },
    }),
    prisma.tripCalendarLink.findUnique({
      where: { tripId },
      select: { provider: true, calendarName: true },
    }),
  ]);
  if (!member || !trip) notFound();

  const period = await getResolvedPeriod(tripId);

  // 날짜 인덱스 — 캘린더 점·기간·날짜→Day 매핑용(활동 본문 없음). 일정 0건이면
  // trip.days 가 빈 배열이라 map 이 실행되지 않으므로 startDate as Date 안전.
  const dayIndex: LayoutDayIndex[] = trip.days.map((d) => ({
    id: d.id,
    date: d.date.toISOString(),
    title: d.title,
    dayNumber: computeDayNumber(d.date, period.startDate as Date),
  }));

  // #669 — 진입 시 선택일 ±N일 활동만 로드. 나머지는 client 가 이동하며 프리페치.
  // 서버 기준 초기 선택일(클라이언트 computeInitialSelected 와 동일 규칙)로 윈도우.
  const today = new Date();
  const serverSelected =
    period.startDate &&
    period.endDate &&
    today >= period.startDate &&
    today <= period.endDate
      ? today
      : (period.startDate ?? today);
  const win = windowYmds(serverSelected, ACTIVITY_WINDOW_RADIUS);
  const windowDays = await prisma.day.findMany({
    where: {
      tripId,
      date: { gte: new Date(win[0]), lte: new Date(win[win.length - 1]) },
    },
    include: {
      activities: { orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }] },
    },
  });
  const initialActivities: Record<number, LayoutActivity[]> = {};
  for (const d of windowDays) {
    initialActivities[d.id] = d.activities.map<LayoutActivity>((a) => ({
      id: a.id,
      title: a.title,
      category: a.category,
      startTime: a.startTime ? a.startTime.toISOString() : null,
      startTimezone: a.startTimezone ?? null,
      endTime: a.endTime ? a.endTime.toISOString() : null,
      endTimezone: a.endTimezone ?? null,
      location: a.location,
      memo: a.memo,
      cost: a.cost ? a.cost.toString() : null,
      currency: a.currency,
      reservationStatus: a.reservationStatus,
      sortOrder: a.sortOrder,
    }));
  }

  const descriptionHtml = trip.description
    ? await markdownToHtml(trip.description)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          여행 목록
        </Link>
      </div>

      {/* spec 032 — 캘린더 중심 단일 화면. 헤더(제목·기간·액션)는 본문 상단
          단독으로 두고, 캘린더·동기화·동행자·선택 일정의 좌우/세로 배치는
          TripDetailLayout 이 viewport 별로 처리한다. */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{trip.title}</h1>
        <p className="text-muted-foreground mt-1 text-sm tabular-nums">
          {period.isDerived && period.startDate && period.endDate ? (
            <>
              {formatCalendarDateFull(period.startDate)} ~{" "}
              {formatCalendarDateFull(period.endDate)}
            </>
          ) : (
            <span className="text-foreground font-medium">일정 미정</span>
          )}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {member.role !== "GUEST" && (
            <AddDayButton
              tripId={tripId}
              tripStartDate={period.startDate?.toISOString() ?? ""}
              tripEndDate={period.endDate?.toISOString() ?? ""}
            />
          )}
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

      <TripDetailLayout
        tripId={tripId}
        tripStart={period.startDate}
        tripEnd={period.endDate}
        days={dayIndex}
        initialActivities={initialActivities}
        canEdit={member.role !== "GUEST"}
        syncCard={
          <CalendarSyncEntryCard
            tripId={tripId}
            role={member.role}
            calendarLinked={Boolean(calendarLink)}
            calendarProvider={calendarLink?.provider ?? null}
            calendarName={calendarLink?.calendarName ?? null}
            providerHint={providerHint}
          />
        }
        memberList={<MemberList tripId={tripId} />}
      />
    </div>
  );
}
