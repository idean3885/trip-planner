"use client";

import { useMemo } from "react";
import Link from "next/link";

interface TripDayInfo {
  dayNum: number;
  fullDate: string; // "2026-06-07"
  timezone: string; // "Europe/Lisbon"
}

// TODO: 드라이런 — 실제 배포 전 아래 DRY_RUN_DATE를 null로 되돌릴 것
const DRY_RUN_DATE = "2026-06-07"; // DAY 1 시뮬레이션 (null이면 실제 날짜 사용)

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
    <Link
      href={`/trips/${tripSlug}/day/${todayDay.dayNum}`}
      className="flex items-center justify-center gap-2 rounded-card bg-primary-600 px-4 py-3 text-white font-semibold text-sm hover:bg-primary-700 transition-colors active:scale-[0.98] min-h-[48px]"
    >
      <span aria-hidden="true">📍</span>
      오늘의 일정 보기 — DAY {todayDay.dayNum}
    </Link>
  );
}
