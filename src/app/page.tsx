import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const trips = await prisma.trip.findMany({
    where: {
      tripMembers: { some: { userId: session.user.id } },
    },
    include: {
      _count: { select: { days: true } },
      tripMembers: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">우리의 여행</h1>
        <Link
          href="/trips/new"
          className="rounded-lg bg-surface-900 px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-surface-700"
        >
          새 여행
        </Link>
      </div>

      {trips.map((trip) => (
        <Link
          key={trip.id}
          href={`/trips/${trip.id}`}
          className="block rounded-card shadow-card p-5 hover:shadow-card-hover transition-shadow active:scale-[0.99]"
        >
          <h2 className="text-lg font-semibold">{trip.title}</h2>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-surface-500">
            {trip.startDate && trip.endDate && (
              <span>
                {trip.startDate.toLocaleDateString("ko-KR")} ~{" "}
                {trip.endDate.toLocaleDateString("ko-KR")}
              </span>
            )}
            <span>{trip._count.days}일</span>
            <span className="text-primary-600">
              {trip.tripMembers[0]?.role === "HOST" ? "호스트" : "게스트"}
            </span>
          </div>

          <span className="mt-3 inline-block text-sm font-medium text-primary-600">
            일정 보기 &rarr;
          </span>
        </Link>
      ))}

      {trips.length === 0 && (
        <div className="text-center py-16 text-surface-400">
          <p className="text-lg">아직 등록된 여행이 없습니다.</p>
          <p className="text-sm mt-1">새 여행을 만들어 보세요.</p>
        </div>
      )}
    </div>
  );
}
