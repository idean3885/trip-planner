"use client";

/**
 * spec 029 T023 — 여행 상세 캘린더 + 일정 리스트 레이아웃.
 *
 * desktop (≥1024px): 좌 캘린더 + 우 사이드 일정 리스트 split. 사이드 default
 *   = 캘린더에서 선택된 날짜 (없으면 안내 카드).
 * mobile (<1024px): 상단 캘린더 + 하단 stacked. 하단은 MobileSwipeShell 이
 *   기본 DAY 목록과 선택 날짜 일정 swap. 좌 스와이프·"뒤로" 버튼·ESC 로
 *   기본 복귀.
 *
 * viewport 분기점은 lg(1024px). `docs/glossary.md` 정본 따름.
 */

import { useState } from "react";
import Link from "next/link";
import type { ActivityCategory, ReservationStatus } from "@prisma/client";
import { formatCalendarDate } from "@/lib/date-utils";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarView } from "./CalendarView";
import { DayActivitiesPane, type PaneDay } from "./DayActivitiesPane";
import { MobileSwipeShell } from "./MobileSwipeShell";

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
  canEdit: boolean;
}

/**
 * 두 Date 가 같은 "달력일" 인지 비교한다. 브라우저 로컬 timezone 기준이라
 * Day.date(`Timestamptz`)가 UTC 자정 저장 + UTC- 권역 사용자 환경에서 하루
 * 어긋날 수 있다. CLAUDE.md 의 "floating-time 관행 #232" 그대로 단순화 채택.
 * 현행 1인+동행자 시나리오(대부분 KST) 한정 안전. 다른 timezone 회귀가 나오면
 * #232 이슈와 함께 별도 사이클에서 다룬다.
 */
function sameLocalDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export function TripDetailLayout({
  tripId,
  tripStart,
  tripEnd,
  days,
  canEdit,
}: TripDetailLayoutProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const daysDates = days.map((d) => new Date(d.date));

  const selectedLayoutDay: LayoutDay | undefined = selectedDate
    ? days.find((d) => sameLocalDay(new Date(d.date), selectedDate))
    : undefined;

  const selectedDay: PaneDay | null = selectedLayoutDay
    ? {
        id: selectedLayoutDay.id,
        title: selectedLayoutDay.title,
        activities: selectedLayoutDay.activities,
      }
    : null;

  const calendarView = (
    <CalendarView
      tripStart={tripStart}
      tripEnd={tripEnd}
      daysDates={daysDates}
      selected={selectedDate ?? undefined}
      onSelect={(d) => setSelectedDate(d ?? null)}
    />
  );

  const defaultMobileList = <DefaultDayList tripId={tripId} days={days} />;

  const sidePane =
    selectedDate && tripStart && tripEnd ? (
      <DayActivitiesPane
        tripId={tripId}
        selectedDate={selectedDate}
        day={selectedDay}
        canEdit={canEdit}
        tripStart={tripStart}
        tripEnd={tripEnd}
      />
    ) : (
      <SidePlaceholder hasTripPeriod={Boolean(tripStart && tripEnd)} />
    );

  return (
    <>
      {/* desktop split */}
      <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
        <div>{calendarView}</div>
        <div>{sidePane}</div>
      </div>

      {/* mobile stacked + in-place swap */}
      <div className="space-y-4 lg:hidden">
        <div>{calendarView}</div>
        <MobileSwipeShell
          isSwapped={selectedDate !== null}
          onSwapBack={() => setSelectedDate(null)}
          defaultView={defaultMobileList}
          swapView={
            selectedDate && tripStart && tripEnd ? (
              <DayActivitiesPane
                tripId={tripId}
                selectedDate={selectedDate}
                day={selectedDay}
                canEdit={canEdit}
                tripStart={tripStart}
                tripEnd={tripEnd}
              />
            ) : null
          }
        />
      </div>
    </>
  );
}

function SidePlaceholder({ hasTripPeriod }: { hasTripPeriod: boolean }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {hasTripPeriod
            ? "캘린더에서 날짜를 선택하면 그 날의 일정이 표시됩니다."
            : "일정이 등록되지 않아 캘린더 범위가 정해지지 않았습니다."}
        </p>
      </CardContent>
    </Card>
  );
}

function DefaultDayList({
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
