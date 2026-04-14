import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tripId = parseInt(id);
  if (isNaN(tripId)) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: session.user.id } },
  });
  if (!member) notFound();

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      days: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!trip) notFound();

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
            {trip.startDate.toLocaleDateString("ko-KR")} ~{" "}
            {trip.endDate.toLocaleDateString("ko-KR")}
          </p>
        )}
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
                {day.date.toLocaleDateString("ko-KR", {
                  month: "numeric",
                  day: "numeric",
                  weekday: "short",
                })}
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
