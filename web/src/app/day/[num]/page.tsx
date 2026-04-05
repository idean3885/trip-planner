import Link from "next/link";
import { getAllDays, getDay } from "@/lib/trips";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  const days = await getAllDays();
  return days.map((d) => ({ num: d.slug }));
}

export default async function DayPage({
  params,
}: {
  params: Promise<{ num: string }>;
}) {
  const { num } = await params;
  const dayNum = parseInt(num, 10);
  const day = await getDay(dayNum);
  if (!day) notFound();

  const days = await getAllDays();
  const prevDay = days.find((d) => d.dayNum === dayNum - 1);
  const nextDay = days.find((d) => d.dayNum === dayNum + 1);

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900"
      >
        &larr; 전체 일정
      </Link>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            DAY {day.dayNum}
          </span>
          <span className="text-sm text-gray-400">{day.date}</span>
        </div>
        <h1 className="text-2xl font-bold capitalize">{day.city}</h1>
      </div>

      <hr className="border-gray-200" />

      <div
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: day.content }}
      />

      <hr className="border-gray-200" />

      <nav className="flex justify-between text-sm">
        {prevDay ? (
          <Link
            href={`/day/${prevDay.dayNum}`}
            className="text-gray-500 hover:text-gray-900"
          >
            &larr; DAY {prevDay.dayNum}
          </Link>
        ) : (
          <span />
        )}
        {nextDay ? (
          <Link
            href={`/day/${nextDay.dayNum}`}
            className="text-gray-500 hover:text-gray-900"
          >
            DAY {nextDay.dayNum} &rarr;
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
