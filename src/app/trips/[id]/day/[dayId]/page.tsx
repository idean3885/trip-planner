import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCalendarDateLong } from "@/lib/date-utils";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import html from "remark-html";
import ActivityList from "@/components/ActivityList";

async function markdownToHtml(md: string): Promise<string> {
  const result = await remark()
    .use(remarkGfm)
    .use(html, { sanitize: false })
    .process(md);
  return result.toString();
}

// DB-정본 전환(#239) 후 이 페이지는 항상 세션 기반 동적 렌더. (#269 마크다운 fallback 제거 완료)
export const dynamic = "force-dynamic";

export default async function DayDetailPage({
  params,
}: {
  params: Promise<{ id: string; dayId: string }>;
}) {
  const { id, dayId } = await params;
  const tripId = parseInt(id);
  const dayIdNum = parseInt(dayId);

  if (isNaN(tripId) || isNaN(dayIdNum)) notFound();
  return <DbDayPage tripId={tripId} dayIdNum={dayIdNum} />;
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

