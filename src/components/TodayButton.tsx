"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface TripDayInfo {
  dayNum: number;
  fullDate: string; // "2026-06-07"
  timezone: string; // "Europe/Lisbon"
}

const DRY_RUN_DATE = "2026-06-07";

function findTodayDay(days: TripDayInfo[]): TripDayInfo | null {
  if (days.length === 0) return null;
  if (DRY_RUN_DATE) {
    return days.find((d) => d.fullDate === DRY_RUN_DATE) ?? null;
  }
  const now = new Date();
  for (const day of days) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: day.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    if (formatter.format(now) === day.fullDate) return day;
  }
  return null;
}

export default function TodayButton({
  tripSlug,
  days,
}: {
  tripSlug: string;
  days: TripDayInfo[];
}) {
  const todayDay = useMemo(() => findTodayDay(days), [days]);

  if (!todayDay) return null;

  return (
    <Button
      size="lg"
      className="w-full min-h-[48px]"
      render={<Link href={`/trips/${tripSlug}/day/${todayDay.dayNum}`} />}
    >
      <span aria-hidden="true">📍</span>
      오늘의 일정 보기 — DAY {todayDay.dayNum}
    </Button>
  );
}
