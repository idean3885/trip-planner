import type { Prisma } from "@prisma/client";

/**
 * 주어진 Trip의 모든 Day를 `date ASC` 순으로 재정렬하여 `sortOrder`를
 * 1부터 순번 부여한다. POST(신규 추가) / PUT(date 변경) / DELETE 이후에 호출.
 *
 * 단일 Trip의 Day는 100건 내외를 가정하므로 전량 O(N) 재작성으로 충분.
 * 동일 date 복수 Day는 Prisma 쿼리 안정성을 위해 id ASC 보조 정렬.
 */
export async function resortDaysByDate(
  tx: Prisma.TransactionClient,
  tripId: number,
): Promise<void> {
  const days = await tx.day.findMany({
    where: { tripId },
    orderBy: [{ date: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  await Promise.all(
    days.map((day, idx) =>
      tx.day.update({
        where: { id: day.id },
        data: { sortOrder: idx + 1 },
      }),
    ),
  );
}
