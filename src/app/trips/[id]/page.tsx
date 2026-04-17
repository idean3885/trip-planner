import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCalendarDateFull, formatCalendarDate } from "@/lib/date-utils";
import InviteButton from "@/components/InviteButton";
import DeleteTripButton from "@/components/DeleteTripButton";
import LeaveTripButton from "@/components/LeaveTripButton";
import MemberList from "@/components/MemberList";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import html from "remark-html";
import {
  getAllTripSlugs,
  getTripOverview,
  getAllDays,
  displayCity,
  stripFirstH1,
  wrapWeatherInDetails,
} from "@/lib/trips";

async function markdownToHtml(md: string): Promise<string> {
  const result = await remark()
    .use(remarkGfm)
    .use(html, { sanitize: false })
    .process(md);
  return result.toString();
}

export async function generateStaticParams() {
  const slugs = getAllTripSlugs();
  return slugs.map((slug) => ({ id: slug }));
}

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tripId = parseInt(id);

  // 숫자 → DB 여행, 문자열 → 마크다운 여행
  if (!isNaN(tripId)) {
    return <DbTripPage tripId={tripId} />;
  }
  return <MarkdownTripPage slug={id} />;
}

/* ── DB 기반 여행 상세 ── */

async function DbTripPage({ tripId }: { tripId: number }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const [member, trip] = await Promise.all([
    prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId, userId: session.user.id } },
    }),
    prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        days: { orderBy: { date: "asc" } },
      },
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
          className="text-body-sm text-surface-500 hover:text-surface-700"
        >
          &larr; 여행 목록
        </Link>
      </div>

      <div>
        <h1 className="text-heading-lg font-bold">{trip.title}</h1>
        {trip.startDate && trip.endDate && (
          <p className="mt-1 text-body-md text-surface-500">
            {formatCalendarDateFull(trip.startDate)} ~{" "}
            {formatCalendarDateFull(trip.endDate)}
          </p>
        )}
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
        <details className="rounded-card shadow-card p-5">
          <summary className="cursor-pointer font-semibold text-surface-700">
            여행 개요
          </summary>
          <div
            className="prose prose-sm mt-3 max-w-none"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        </details>
      )}

      <MemberList tripId={tripId} />

      <div className="space-y-3">
        <h2 className="text-heading-sm font-semibold">일정</h2>
        {trip.days.map((day) => (
          <Link
            key={day.id}
            href={`/trips/${trip.id}/day/${day.id}`}
            className="block rounded-card shadow-card p-4 hover:shadow-card-hover transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-body-sm font-semibold text-primary-600">
                  DAY {day.sortOrder}
                </span>
                {day.title && (
                  <span className="ml-2 text-body-md text-surface-700">
                    {day.title}
                  </span>
                )}
              </div>
              <span className="text-body-sm text-surface-400">
                {formatCalendarDate(day.date)}
              </span>
            </div>
          </Link>
        ))}

        {trip.days.length === 0 && (
          <p className="text-center py-8 text-surface-400">
            일정이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}

/* ── 마크다운 기반 여행 상세 ── */

async function MarkdownTripPage({ slug }: { slug: string }) {
  let overview;
  try {
    overview = await getTripOverview(slug);
  } catch {
    notFound();
  }

  const days = await getAllDays(slug);

  return (
    <div className="space-y-8">
      <nav className="flex items-center gap-1.5 text-sm text-surface-500 min-h-[44px]">
        <Link href="/" className="hover:text-surface-900 transition-colors" aria-label="홈">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </Link>
        <span className="text-surface-300">/</span>
        <span className="text-surface-900 font-medium">{overview.title}</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold">{overview.title}</h1>
      </div>

      <section className="shadow-card rounded-card p-5">
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: wrapWeatherInDetails(stripFirstH1(overview.content)) }}
        />
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xl font-bold">일정표</h2>
          <span className="text-sm text-surface-400">{days.length}일</span>
        </div>

        <div className="space-y-2">
          {days.map((day) => (
            <Link
              key={day.dayNum}
              href={`/trips/${slug}/day/${day.dayNum}`}
              className="flex items-center gap-3 rounded-card shadow-card px-4 py-3 hover:shadow-card-hover transition-shadow active:scale-[0.99] min-h-[56px]"
            >
              <span className="inline-block rounded bg-primary-600 text-white text-xs font-semibold px-2.5 py-1 min-w-[52px] text-center shrink-0">
                DAY {day.dayNum}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {displayCity(day.city)}
                </p>
                <p className="text-xs text-surface-400 mt-0.5">{day.date}</p>
              </div>
              <span className="text-surface-300 shrink-0">&rsaquo;</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
