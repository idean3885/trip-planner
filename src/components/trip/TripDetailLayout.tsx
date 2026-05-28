"use client";

/**
 * spec 031 — 여행 상세 좌-캘린더 단독 레이아웃.
 *
 * 데스크탑 ≥1024px에서 본문 좌측 셀에 캘린더만 노출한다. spec 029 Stage 2의
 * 가운데 sidePane(트립 체크박스 + 선택 날짜 일정 패널 + placeholder)은 제거.
 * 캘린더 셀 클릭 시 해당 일자의 Day 페이지로 즉시 이동한다.
 *
 * 모바일(<1024px)은 기존과 동일하게 캘린더 + Day 카드 목록을 세로로 쌓는다.
 *
 * 다중 trip 통합 표시(체크박스·색 dot/bar 분리)는 본 피처 범위 외 — 후속
 * 사이클에서 SidePanel 내 토글 등 다른 동선으로 재배치 검토.
 */

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ActivityCategory, ReservationStatus } from "@prisma/client";
import { formatCalendarDate } from "@/lib/date-utils";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarView } from "./CalendarView";

export interface LayoutActivity {
  id: number;
  title: string;
  category: ActivityCategory;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  reservationStatus: ReservationStatus | null;
}

export interface LayoutDay {
  id: number;
  date: string;
  title: string | null;
  dayNumber: number;
  activities: LayoutActivity[];
}

export interface TripDetailLayoutProps {
  tripId: number;
  tripStart: Date | null;
  tripEnd: Date | null;
  days: LayoutDay[];
}

/**
 * 두 Date 가 같은 "달력일" 인지 비교한다. 브라우저 로컬 timezone 기준이라
 * Day.date(`Timestamptz`)가 UTC 자정 저장 + UTC- 권역 사용자 환경에서 하루
 * 어긋날 수 있다. CLAUDE.md 의 "floating-time 관행 #232" 그대로 단순화 채택.
 */
function sameLocalDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export function TripDetailLayout({
  tripId,
  tripStart,
  tripEnd,
  days,
}: TripDetailLayoutProps) {
  const router = useRouter();

  const daysDates = useMemo(
    () => days.map((d) => new Date(d.date)),
    [days],
  );

  const handleSelectDate = useCallback(
    (date: Date | undefined) => {
      if (!date) return;
      const matched = days.find((d) => sameLocalDay(new Date(d.date), date));
      if (!matched) return;
      router.push(`/trips/${tripId}/day/${matched.id}`);
    },
    [days, router, tripId],
  );

  const calendarView = (
    <CalendarView
      tripStart={tripStart}
      tripEnd={tripEnd}
      daysDates={daysDates}
      onSelect={handleSelectDate}
    />
  );

  const emptyNotice =
    days.length === 0 ? (
      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            아직 일정이 등록되지 않았습니다. 일정을 추가하면 캘린더에 기간이
            강조됩니다.
          </p>
        </CardContent>
      </Card>
    ) : null;

  return (
    <div className="space-y-4">
      {emptyNotice}
      {calendarView}
      {/* 모바일에서만 Day 카드 목록을 캘린더 아래에 노출 (데스크탑은 셀 클릭으로 진입). */}
      <div className="lg:hidden">
        <DayList tripId={tripId} days={days} />
      </div>
    </div>
  );
}

function DayList({
  tripId,
  days,
}: {
  tripId: number;
  days: LayoutDay[];
}) {
  if (days.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            등록된 일정이 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <ul className="space-y-2">
      {days.map((day) => (
        <li key={day.id}>
          <Link
            href={`/trips/${tripId}/day/${day.id}`}
            className="group block"
          >
            <Card size="sm" className="transition-all group-hover:ring-foreground/20">
              <CardContent className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="inline-flex items-center rounded-md bg-foreground px-2 py-0.5 text-xs font-medium text-background shrink-0 tabular-nums">
                    DAY {day.dayNumber}
                  </span>
                  {day.title && (
                    <span className="text-sm text-foreground truncate">
                      {day.title}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {formatCalendarDate(new Date(day.date))}
                </span>
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
