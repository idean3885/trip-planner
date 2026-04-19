import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Lightbulb } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCalendarDateLong } from "@/lib/date-utils";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import html from "remark-html";
import ActivityList from "@/components/ActivityList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          홈
        </Link>
        <span aria-hidden>·</span>
        <Link href={`/trips/${tripId}`} className="hover:text-foreground">
          {day.trip.title}
        </Link>
        <span aria-hidden>·</span>
        <span className="text-foreground">DAY {day.sortOrder}</span>
      </nav>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          DAY {day.sortOrder}
          {day.title && ` — ${day.title}`}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
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
          cost: a.cost?.toString() ?? null,
        }))}
        canEdit={member.role !== "GUEST"}
      />

      {day.content && (
        <Card>
          <CardHeader>
            <CardTitle>레거시 메모</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {member.role !== "GUEST" && (
              <div className="flex items-start gap-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                <Lightbulb className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>
                  이 메모를 활동으로 변환하려면 Claude Desktop에서{" "}
                  <code className="rounded bg-background px-1 py-0.5 text-[11px] ring-1 ring-foreground/10">
                    get_day_content → create_activity × N → clear_day_content
                  </code>{" "}
                  순서로 요청하세요.
                </span>
              </div>
            )}
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
