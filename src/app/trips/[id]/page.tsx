import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import CalendarSyncEntryCard from "@/components/calendar-sync/CalendarSyncEntryCard";
import MemberList from "@/components/MemberList";
import {
  type LayoutActivity,
  type LayoutDayIndex,
  TripDetailLayout,
} from "@/components/trip/TripDetailLayout";
import { ACTIVITY_WINDOW_RADIUS, windowYmds } from "@/lib/activity-window";
import { formatCalendarDateFull } from "@/lib/date-utils";
import { computeDayNumber } from "@/lib/day-number";
import {
  convertToKrw,
  isTripInProgress,
  resolveTimingDefault,
  summarize,
} from "@/lib/expense";
import { getRatesForPairs } from "@/lib/fx/rates";
import { prisma } from "@/lib/prisma";
import { getResolvedPeriod } from "@/lib/trip-period";

// DB-정본 전환(#239) 후 이 페이지는 항상 세션 기반 동적 렌더. (#255+ 핫픽스)
export const dynamic = "force-dynamic";

/** Date → UTC 기준 "YYYY-MM-DD" (근사 환율 맵 키와 동일 규칙). */
function ymdUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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
      include: {
        days: { orderBy: { date: "asc" } },
        _count: { select: { tripMembers: true } },
      },
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
  // spec 062 — 같은 조회로 (일자, 통화) 근사 환율을 확보해 원화 환산도 산출.
  const costRows = await prisma.activity.findMany({
    where: { day: { tripId } },
    select: {
      cost: true,
      currency: true,
      paymentTiming: true,
      day: { select: { date: true } },
    },
  });
  const tripSummary = summarize(
    costRows.map((a) => ({
      cost: a.cost ? a.cost.toString() : null,
      currency: a.currency,
      paymentTiming: a.paymentTiming,
    })),
  );

  // spec 062 — 자동 근사 환율 맵(현화-only fallback graceful). 일별·총액 공용.
  const rateMap = await getRatesForPairs(
    costRows.map((a) => ({ base: a.currency, date: a.day.date })),
  );
  const datedItems = costRows.map((a) => ({
    cost: a.cost ? a.cost.toString() : null,
    currency: a.currency,
    paymentTiming: a.paymentTiming,
    dateYmd: ymdUTC(a.day.date),
  }));
  const tripKrw = convertToKrw(datedItems, rateMap);

  // spec 043 US2 — 헤더 브레드크럼 `여행 목록 > 제목 (기간)`. spec 063 후속:
  // 햄버거(☰) 메뉴와 같은 줄에 두려고 TripDetailLayout 에 노드로 넘긴다(빈 줄 제거).
  const breadcrumb = (
    <nav className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
      <Link href="/trips" className="hover:text-foreground">
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
  );

  return (
    <div>
      <TripDetailLayout
        breadcrumb={breadcrumb}
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
        tripKrw={tripKrw}
        rateMap={rateMap}
        tripInProgress={isTripInProgress({
          startDate: period.startDate,
          endDate: period.endDate,
        })}
        memberCount={trip._count.tripMembers}
        description={trip.description}
        memberList={<MemberList tripId={tripId} />}
        syncCard={<CalendarSyncEntryCard tripId={tripId} role={member.role} />}
      />
    </div>
  );
}
