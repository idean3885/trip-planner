import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllTripSlugs, getAllDays, getDay } from "@/lib/trips";

export async function generateStaticParams() {
  const slugs = getAllTripSlugs();
  const params: { slug: string; num: string }[] = [];
  for (const slug of slugs) {
    const days = await getAllDays(slug);
    for (const day of days) {
      params.push({ slug, num: day.slug });
    }
  }
  return params;
}

const cityDisplay: Record<string, string> = {
  lisbon: "리스본", porto: "포르투", madrid: "마드리드",
  sevilla: "세비야", granada: "그라나다", barcelona: "바르셀로나",
  arrival: "도착", departure: "출발", wine: "와인",
  douro: "도우루", valley: "계곡", gaudi: "가우디",
  montserrat: "몬세라트", beach: "해변", shopping: "쇼핑",
};

function displayCity(raw: string): string {
  return raw.split(" ").map((w) => cityDisplay[w.toLowerCase()] ?? w).join(" · ");
}

export default async function DayPage({
  params,
}: {
  params: Promise<{ slug: string; num: string }>;
}) {
  const { slug, num } = await params;
  const dayNum = parseInt(num, 10);
  const day = await getDay(dayNum, slug);
  if (!day) notFound();

  const days = await getAllDays(slug);
  const prevDay = days.find((d) => d.dayNum === dayNum - 1);
  const nextDay = days.find((d) => d.dayNum === dayNum + 1);

  return (
    <div className="space-y-6">
      <Link
        href={`/trips/${slug}`}
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 min-h-[44px]"
      >
        &larr; 전체 일정
      </Link>

      <div className="flex items-start gap-3">
        <span className="inline-block rounded bg-blue-600 text-white text-xs font-semibold px-2.5 py-1 mt-1 shrink-0">
          DAY {day.dayNum}
        </span>
        <div>
          <h1 className="text-2xl font-bold">{displayCity(day.city)}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{day.date}</p>
        </div>
      </div>

      <hr className="border-gray-200" />

      <div
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: day.content }}
      />

      <hr className="border-gray-200" />

      <nav className="flex justify-between gap-2">
        {prevDay ? (
          <Link
            href={`/trips/${slug}/day/${prevDay.dayNum}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 min-h-[44px]"
          >
            &larr; DAY {prevDay.dayNum}
          </Link>
        ) : (
          <span />
        )}
        {nextDay ? (
          <Link
            href={`/trips/${slug}/day/${nextDay.dayNum}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 min-h-[44px] ml-auto"
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
