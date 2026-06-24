import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import html from "remark-html";

import { auth } from "@/auth";
import CalendarSyncEntryCard from "@/components/calendar-sync/CalendarSyncEntryCard";
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
import { resolveTimingDefault, summarize } from "@/lib/expense";
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

/** "YYYY-MM-DD" → UTC 자정 Date. 형식 위반·무효는 null. */
function parseYmd(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function TripDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ d?: string }>;
}) {
  const { id } = await params;
  const tripId = parseInt(id);
  const sp = await searchParams;
  // spec 043 US5 — 선택 일자를 쿼리(?d=YYYY-MM-DD)로 받아 진입/새로고침 시 복원.
  const selectedYmd = parseYmd(sp.d) ? sp.d! : null;

  if (isNaN(tripId)) notFound();
  return <DbTripPage tripId={tripId} selectedYmd={selectedYmd} />;
}

/* ── DB 기반 여행 상세 ── */

async function DbTripPage({
  tripId,
  selectedYmd,
}: {
  tripId: number;
  selectedYmd: string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const [member, trip] = await Promise.all([
    prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId, userId: session.user.id } },
    }),
    // #669 — 인덱스만(활동 제외). 활동은 선택일 윈도우만 따로 받는다.
    prisma.trip.findUnique({
      where: { id: tripId },
      include: { days: { orderBy: { date: "asc" } } },
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
  const urlSelected = parseYmd(selectedYmd ?? undefined);
  const serverSelected =
    urlSelected ??
    (period.startDate &&
    period.endDate &&
    today >= period.startDate &&
    today <= period.endDate
      ? today
      : (period.startDate ?? today));
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
      paymentTiming: a.paymentTiming,
      sortOrder: a.sortOrder,
    }));
  }

  // spec 061 US4 (#811) — 여행 총액 합산. windowDays 는 선택일 ±N일만 담으므로
  // 총액은 전체 활동의 금액 컬럼만 가볍게 따로 조회해 통화별로 합산한다.
  const costRows = await prisma.activity.findMany({
    where: { day: { tripId } },
    select: { cost: true, currency: true, paymentTiming: true },
  });
  const tripSummary = summarize(
    costRows.map((a) => ({
      cost: a.cost ? a.cost.toString() : null,
      currency: a.currency,
      paymentTiming: a.paymentTiming,
    })),
  );

  const descriptionHtml = trip.description
    ? await markdownToHtml(trip.description)
    : null;

  return (
    <div className="space-y-6">
      {/* spec 043 US2 — 헤더는 `여행 목록 > 제목 (기간)` 브레드크럼 한 줄로만 둔다.
          기간 편집·동행자·나가기/삭제·캘린더 가져오기·선택 일자 삭제 등 동작 버튼은
          선택 일자(클라이언트 상태)에 의존하므로 TripDetailLayout 액션바로 모은다. */}
      <nav className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
        <Link href="/" className="hover:text-foreground">
          여행 목록
        </Link>
        <ChevronRight className="size-3.5 shrink-0" aria-hidden />
        <span className="text-foreground font-medium">{trip.title}</span>
        {period.isDerived && period.startDate && period.endDate ? (
          <span className="text-muted-foreground tabular-nums">
            ({formatCalendarDateFull(period.startDate)} ~{" "}
            {formatCalendarDateFull(period.endDate)})
          </span>
        ) : (
          <span className="text-muted-foreground">(일정 미정)</span>
        )}
      </nav>

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
        tripTitle={trip.title}
        isOwner={member.role === "OWNER"}
        tripStart={period.startDate}
        tripEnd={period.endDate}
        days={dayIndex}
        initialActivities={initialActivities}
        canEdit={member.role !== "GUEST"}
        initialSelected={selectedYmd}
        timingDefault={resolveTimingDefault({
          startDate: period.startDate,
          endDate: period.endDate,
        })}
        tripSummary={tripSummary}
        memberList={<MemberList tripId={tripId} />}
        syncCard={<CalendarSyncEntryCard tripId={tripId} role={member.role} />}
      />
    </div>
  );
}
