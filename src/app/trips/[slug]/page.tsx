import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllTripSlugs, getTripOverview, getAllDays, stripFirstH1, wrapWeatherInDetails } from "@/lib/trips";

export async function generateStaticParams() {
  const slugs = getAllTripSlugs();
  return slugs.map((slug) => ({ slug }));
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

export default async function TripPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let overview;
  try {
    overview = await getTripOverview(slug);
  } catch {
    notFound();
  }

  const days = await getAllDays(slug);

  return (
    <div className="space-y-8">
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 min-h-[44px]">
        <Link href="/" className="hover:text-gray-900 transition-colors" aria-label="홈">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">{overview.title}</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold">{overview.title}</h1>
      </div>

      <section className="rounded-lg border border-gray-200 p-5">
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: wrapWeatherInDetails(stripFirstH1(overview.content)) }}
        />
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xl font-bold">일정표</h2>
          <span className="text-sm text-gray-400">{days.length}일</span>
        </div>

        <div className="space-y-2">
          {days.map((day) => (
            <Link
              key={day.dayNum}
              href={`/trips/${slug}/day/${day.dayNum}`}
              className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 hover:border-gray-400 hover:shadow-sm transition-all active:scale-[0.99] min-h-[56px]"
            >
              <span className="inline-block rounded bg-blue-600 text-white text-xs font-semibold px-2.5 py-1 min-w-[52px] text-center">
                DAY {day.dayNum}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {displayCity(day.city)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{day.date}</p>
              </div>
              <span className="text-gray-300 shrink-0">&rsaquo;</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
