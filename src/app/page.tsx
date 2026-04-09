import Link from "next/link";
import { getAllTrips } from "@/lib/trips";
import TodayButton from "@/components/TodayButton";

export default async function Home() {
  const trips = await getAllTrips();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">우리의 여행</h1>
      {trips.map((trip) => (
        <div key={trip.slug} className="space-y-2">
          {trip.days && trip.days.length > 0 && (
            <TodayButton tripSlug={trip.slug} days={trip.days} />
          )}

          <Link
            href={`/trips/${trip.slug}`}
            className="block rounded-card shadow-card p-5 hover:shadow-card-hover transition-shadow active:scale-[0.99]"
          >
            <h2 className="text-lg font-semibold">{trip.title}</h2>

            {(trip.period || trip.theme) && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-surface-500">
                {trip.period && <span>{trip.period}</span>}
                {trip.theme && <span>{trip.theme}</span>}
              </div>
            )}

            {trip.cities && (
              <p className="mt-2 text-sm text-surface-600">{trip.cities}</p>
            )}

            <span className="mt-3 inline-block text-sm font-medium text-primary-600">
              일정 보기 &rarr;
            </span>
          </Link>
        </div>
      ))}
      {trips.length === 0 && (
        <div className="text-center py-16 text-surface-400">
          <p className="text-lg">아직 등록된 여행이 없습니다.</p>
          <p className="text-sm mt-1">trips/ 폴더에 여행 디렉토리를 추가하세요.</p>
        </div>
      )}
    </div>
  );
}
