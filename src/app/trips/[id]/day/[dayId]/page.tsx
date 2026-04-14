import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCalendarDateLong } from "@/lib/date-utils";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import html from "remark-html";
import DayEditor from "@/components/DayEditor";

async function markdownToHtml(md: string): Promise<string> {
  const result = await remark()
    .use(remarkGfm)
    .use(html, { sanitize: false })
    .process(md);
  return result.toString();
}

export default async function DayDetailPage({
  params,
}: {
  params: Promise<{ id: string; dayId: string }>;
}) {
  const { id, dayId } = await params;
  const tripId = parseInt(id);
  const dayIdNum = parseInt(dayId);
  if (isNaN(tripId) || isNaN(dayIdNum)) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: session.user.id } },
  });
  if (!member) notFound();

  const day = await prisma.day.findUnique({
    where: { id: dayIdNum, tripId },
    include: { trip: { select: { title: true } } },
  });
  if (!day) notFound();

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

      <DayEditor
        tripId={tripId}
        dayId={day.id}
        initialContent={day.content ?? ""}
        initialHtml={contentHtml}
        canEdit={member.role !== "GUEST"}
      />
    </div>
  );
}
