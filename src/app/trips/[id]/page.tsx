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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tripId = parseInt(id);

  if (isNaN(tripId)) notFound();
  return <DbTripPage tripId={tripId} />;
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
