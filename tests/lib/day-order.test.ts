import { describe, it, expect, vi } from "vitest";
import { resortDaysByDate } from "@/lib/day-order";
import type { Prisma } from "@prisma/client";

function makeTxMock(days: Array<{ id: number }>) {
  const findMany = vi.fn().mockResolvedValue(days);
  const update = vi.fn().mockResolvedValue({});
  return {
    tx: { day: { findMany, update } } as unknown as Prisma.TransactionClient,
    findMany,
    update,
  };
}

describe("resortDaysByDate", () => {
  it("assigns sortOrder 1..N by date ASC", async () => {
    const { tx, findMany, update } = makeTxMock([
      { id: 100 },
      { id: 101 },
      { id: 102 },
    ]);

    await resortDaysByDate(tx, 7);

    expect(findMany).toHaveBeenCalledWith({
      where: { tripId: 7 },
      orderBy: [{ date: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    expect(update).toHaveBeenCalledTimes(3);
    expect(update).toHaveBeenNthCalledWith(1, {
      where: { id: 100 },
      data: { sortOrder: 1 },
    });
    expect(update).toHaveBeenNthCalledWith(2, {
      where: { id: 101 },
      data: { sortOrder: 2 },
    });
    expect(update).toHaveBeenNthCalledWith(3, {
      where: { id: 102 },
      data: { sortOrder: 3 },
    });
  });

  it("no-op when Trip has no days", async () => {
    const { tx, update } = makeTxMock([]);
    await resortDaysByDate(tx, 99);
    expect(update).not.toHaveBeenCalled();
  });

  it("starts numbering from 1 — not 0 (DAY 0 방지)", async () => {
    const { tx, update } = makeTxMock([{ id: 1 }]);
    await resortDaysByDate(tx, 1);
    expect(update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { sortOrder: 1 },
    });
  });
});
