import Link from "next/link";
import { notFound } from "next/navigation";
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
import fs from "fs";
import path from "path";

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

  // Get trip title for breadcrumb
  let tripTitle = slug;
  try {
    const overview = await getTripOverview(slug);
    tripTitle = overview.title;
  } catch {
    // fallback to slug
  }

  // Get weather for this day's city
  const overviewPath = path.join(process.cwd(), "trips", slug, "overview.md");
  let weather = null;
  if (fs.existsSync(overviewPath)) {
    const raw = fs.readFileSync(overviewPath, "utf-8");
    const allWeather = extractWeatherFromOverview(raw);
    weather = getWeatherForCity(allWeather, day.city);
  }

  // Compute local date from KST date
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
      {/* Sticky Header: breadcrumb + nav + title + weather */}
      <div className="sticky top-0 z-20 -mx-4 px-4 pt-3 pb-3 bg-white/95 backdrop-blur-sm border-b border-surface-100 space-y-2">
        {/* Breadcrumb */}
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

        {/* Day Header */}
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

        {/* Prev/Next Navigation */}
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

        {/* Weather Badge */}
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
