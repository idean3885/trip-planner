import Link from "next/link";
import { getTripOverview, getAllDays } from "@/lib/trips";

export default async function Home() {
  const overview = await getTripOverview();
  const days = await getAllDays();

  return (
    <div className="space-y-8">
      <section>
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: overview.content }}
        />
      </section>

      <hr className="border-gray-200" />

      <section>
        <h2 className="text-xl font-semibold mb-4">일정표</h2>
        <div className="space-y-2">
          {days.map((day) => (
            <Link
              key={day.dayNum}
              href={`/day/${day.dayNum}`}
              className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-400 transition-colors"
            >
              <div className="flex items-baseline gap-3">
                <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  DAY {day.dayNum}
                </span>
                <span className="text-sm text-gray-400">{day.date}</span>
              </div>
              <p className="mt-1 font-medium capitalize">{day.city}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
