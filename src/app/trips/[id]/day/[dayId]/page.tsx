import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCalendarDateLong } from "@/lib/date-utils";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import html from "remark-html";
import fs from "fs";
import path from "path";
import ActivityList from "@/components/ActivityList";
import {
  getAllTripSlugs,
  getAllDays,
  getDay,
  getTripOverview,
  extractWeatherFromOverview,
  getWeatherForCity,
  toLocalDate,
  displayCity,
} from "@/lib/trips";

async function markdownToHtml(md: string): Promise<string> {
  const result = await remark()
    .use(remarkGfm)
    .use(html, { sanitize: false })
    .process(md);
  return result.toString();
}

// DB-정본 전환(#239) 후 이 페이지는 항상 세션 기반 동적 렌더. generateStaticParams
// 제거 + force-dynamic. 남은 MarkdownDayPage 브랜치는 trips/ 파일 부재로 항상
// notFound()로 귀결된다.
export const dynamic = "force-dynamic";

export default async function DayDetailPage({
  params,
}: {
  params: Promise<{ id: string; dayId: string }>;
}) {
  const { id, dayId } = await params;
  const tripId = parseInt(id);
  const dayIdNum = parseInt(dayId);

  // 숫자 → DB, 문자열 → 마크다운
  if (!isNaN(tripId) && !isNaN(dayIdNum)) {
    return <DbDayPage tripId={tripId} dayIdNum={dayIdNum} />;
  }
  if (isNaN(tripId)) {
    return <MarkdownDayPage slug={id} num={dayId} />;
  }
  notFound();
}

/* ── DB 기반 일자 상세 ── */

async function DbDayPage({ tripId, dayIdNum }: { tripId: number; dayIdNum: number }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const [member, day] = await Promise.all([
    prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId, userId: session.user.id } },
    }),
    prisma.day.findUnique({
      where: { id: dayIdNum, tripId },
      include: {
        trip: { select: { title: true } },
        activities: { orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }] },
      },
    }),
  ]);
  if (!member || !day) notFound();

  const contentHtml = day.content ? await markdownToHtml(day.content) : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-body-sm text-surface-500">
        <Link href="/" className="hover:text-surface-700">
          홈
        </Link>
        <span>/</span>
        <Link
          href={`/trips/${tripId}`}
          className="hover:text-surface-700"
        >
          {day.trip.title}
        </Link>
        <span>/</span>
        <span className="text-surface-700">DAY {day.sortOrder}</span>
      </div>

      <div>
        <h1 className="text-heading-lg font-bold">
          DAY {day.sortOrder}
          {day.title && ` — ${day.title}`}
        </h1>
        <p className="mt-1 text-body-md text-surface-500">
          {formatCalendarDateLong(day.date)}
        </p>
      </div>

      <ActivityList
        tripId={tripId}
        dayId={day.id}
        activities={day.activities.map((a) => ({
          ...a,
          startTime: a.startTime?.toISOString() ?? null,
          endTime: a.endTime?.toISOString() ?? null,
        }))}
        canEdit={member.role !== "GUEST"}
      />

      {day.content && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-heading-sm font-semibold text-surface-700">레거시 메모</h2>
          </div>
          {member.role !== "GUEST" && (
            <div className="flex items-start gap-2 rounded-card border border-sky-200 bg-sky-50 px-3 py-2 text-body-sm text-sky-700">
              <span className="shrink-0">💡</span>
              <span>
                이 메모를 활동으로 변환하려면 Claude Desktop에서{" "}
                <code className="rounded bg-sky-100 px-1 py-0.5 text-[11px]">
                  get_day_content → create_activity × N → clear_day_content
                </code>{" "}
                순서로 요청하세요.
              </span>
            </div>
          )}
          <div
            className="prose prose-sm max-w-none rounded-card border border-surface-200 p-4"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        </div>
      )}
    </div>
  );
}

/* ── 마크다운 기반 일자 상세 ── */

async function MarkdownDayPage({ slug, num }: { slug: string; num: string }) {
  const dayNum = parseInt(num, 10);
  const day = await getDay(dayNum, slug);
  if (!day) notFound();

  const days = await getAllDays(slug);
  const prevDay = days.find((d) => d.dayNum === dayNum - 1);
  const nextDay = days.find((d) => d.dayNum === dayNum + 1);

  let tripTitle = slug;
  try {
    const overview = await getTripOverview(slug);
    tripTitle = overview.title;
  } catch {
    // fallback to slug
  }

  const overviewPath = path.join(process.cwd(), "trips", slug, "overview.md");
  let weather = null;
  if (fs.existsSync(overviewPath)) {
    const raw = fs.readFileSync(overviewPath, "utf-8");
    const allWeather = extractWeatherFromOverview(raw);
    weather = getWeatherForCity(allWeather, day.city);
  }

  const yearMatch = slug.match(/^(\d{4})-/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
  const timezone = (() => {
    const knownCities: Record<string, string> = {
      lisbon: "Europe/Lisbon", porto: "Europe/Lisbon",
      madrid: "Europe/Madrid", sevilla: "Europe/Madrid",
      granada: "Europe/Madrid", barcelona: "Europe/Madrid",
    };
    const lower = day.city.toLowerCase();
    const city = Object.keys(knownCities).find((c) => lower.includes(c));
    return city ? knownCities[city] : "Europe/Madrid";
  })();
  const localDate = toLocalDate(year, day.date, timezone);
  const showLocalDate = localDate !== day.date;

  return (
    <div className="space-y-4 -mt-6">
      <div className="sticky top-0 z-20 -mx-4 px-4 pt-3 pb-3 bg-white/95 backdrop-blur-sm border-b border-surface-100 space-y-2">
        <nav className="flex items-center gap-1.5 text-sm text-surface-500">
          <Link href="/" className="hover:text-surface-900 transition-colors" aria-label="홈">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </Link>
          <span className="text-surface-300">/</span>
          <Link href={`/trips/${slug}`} className="hover:text-surface-900 transition-colors">
            {tripTitle}
          </Link>
          <span className="text-surface-300">/</span>
          <span className="text-surface-900 font-medium">DAY {day.dayNum}</span>
        </nav>

        <div className="flex items-center gap-3">
          <span className="inline-block rounded bg-primary-600 text-white text-xs font-semibold px-2.5 py-1 shrink-0">
            DAY {day.dayNum} - {day.date}
          </span>
          <h1 className="text-lg font-bold">
            {displayCity(day.city)}
            {showLocalDate && (
              <span className="text-sm font-normal text-surface-400 ml-1.5">
                (현지 {localDate})
              </span>
            )}
          </h1>
        </div>

        <nav className="flex items-center justify-center gap-6 text-surface-400 text-sm">
          {prevDay ? (
            <Link
              href={`/trips/${slug}/day/${prevDay.dayNum}`}
              className="hover:text-surface-900 min-h-[36px] inline-flex items-center gap-1"
              aria-label={`DAY ${prevDay.dayNum}`}
            >
              &larr; DAY {prevDay.dayNum}
            </Link>
          ) : (
            <span />
          )}
          {nextDay ? (
            <Link
              href={`/trips/${slug}/day/${nextDay.dayNum}`}
              className="hover:text-surface-900 min-h-[36px] inline-flex items-center gap-1"
              aria-label={`DAY ${nextDay.dayNum}`}
            >
              DAY {nextDay.dayNum} &rarr;
            </Link>
          ) : (
            <span />
          )}
        </nav>

        {weather && (
          <div className="flex items-center gap-2 rounded-card bg-sky-50 border border-sky-100 px-3 py-1.5 text-sm">
            <span className="text-sky-700 font-medium">{weather.cityKo}</span>
            <span className="text-surface-700">{weather.temp}</span>
            <span className="text-surface-500">{weather.note}</span>
          </div>
        )}
      </div>

      <div
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: day.content }}
      />
    </div>
  );
}
