"use client";

/**
 * spec 029 T021 + #595 T034 — 월별 미니 캘린더.
 *
 * 여행 derived 기간(start ~ end) 강조 + 오늘 강조 + 일정이 있는 날짜 dot.
 * `tripsDays` 가 주어지면 통합 캘린더 모드로 동작 — 각 trip 의 색 dot 을
 * 날짜 칸 하단에 같이 표시하기 위해 DayButton 을 custom render 한다. 단일
 * trip 사용 시 `tripsDays` 를 비워두면 hasActivity 단일 dot 으로 동작한다.
 */

import * as React from "react";
import { ko } from "react-day-picker/locale";
import type { Matcher } from "react-day-picker";

import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { getTripColor } from "@/lib/trip-palette";

export interface TripDayGroup {
  tripId: number;
  dates: Date[];
}

export interface CalendarViewProps {
  /** 여행 derived 시작일. 일정 ≥1건일 때 trip 기간 강조에 사용. */
  tripStart: Date | null;
  /** 여행 derived 종료일. 일정 ≥1건일 때 trip 기간 강조에 사용. */
  tripEnd: Date | null;
  /** 일정이 있는 날짜 목록 (단일 trip 모드 dot 표시용). */
  daysDates: Date[];
  /**
   * 통합 캘린더 모드. trip 별 일정 날짜를 분리해 전달하면 색 dot 으로
   * 표시. 길이 ≥ 1 일 때 hasActivity 단일 dot 대신 trip 별 색 dot 으로
   * 노출. 단일 trip 모드는 비워둔다(`undefined` 또는 `[]`).
   */
  tripsDays?: TripDayGroup[];
  /** 선택된 날짜. 기본은 오늘 (오늘이 trip 기간 밖이면 trip 시작일). */
  selected?: Date;
  /** 날짜 클릭 핸들러. */
  onSelect?: (date: Date | undefined) => void;
  /** 통합 캘린더용 추가 modifiers. key가 modifier 이름, value가 매처. */
  extraModifiers?: Record<string, Matcher | Matcher[]>;
  /** extraModifiers와 짝을 이루는 className. */
  extraModifierClassNames?: Record<string, string>;
  className?: string;
}

function sameLocalDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

const MAX_VISIBLE_DOTS = 3 as const;

export function CalendarView({
  tripStart,
  tripEnd,
  daysDates,
  tripsDays,
  selected,
  onSelect,
  extraModifiers,
  extraModifierClassNames,
  className,
}: CalendarViewProps) {
  const isMultiTrip = (tripsDays?.length ?? 0) > 0;

  const tripRange: Matcher | undefined =
    tripStart && tripEnd ? { from: tripStart, to: tripEnd } : undefined;

  const modifiers: Record<string, Matcher | Matcher[]> = {
    ...(tripRange ? { tripRange } : {}),
    // 다중 trip 모드에서는 dot 을 custom DayButton 이 그리므로 hasActivity
    // modifier 자체를 제거해 단일 dot 과의 중복 노출을 막는다.
    ...(isMultiTrip ? {} : { hasActivity: daysDates }),
    ...(extraModifiers ?? {}),
  };

  const modifiersClassNames: Record<string, string> = {
    tripRange: "bg-primary/10",
    ...(isMultiTrip
      ? {}
      : {
          hasActivity:
            "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:size-1 after:rounded-full after:bg-primary",
        }),
    ...(extraModifierClassNames ?? {}),
  };

  const defaultMonth = selected ?? tripStart ?? undefined;

  const components = isMultiTrip
    ? {
        DayButton: (
          dayProps: React.ComponentProps<typeof CalendarDayButton>,
        ) => <MultiTripDayButton tripsDays={tripsDays!} {...dayProps} />,
      }
    : undefined;

  return (
    <Calendar
      mode="single"
      locale={ko}
      selected={selected}
      onSelect={onSelect}
      defaultMonth={defaultMonth}
      modifiers={modifiers}
      modifiersClassNames={modifiersClassNames}
      components={components}
      className={className}
    />
  );
}

function MultiTripDayButton({
  tripsDays,
  ...buttonProps
}: React.ComponentProps<typeof CalendarDayButton> & {
  tripsDays: TripDayGroup[];
}) {
  const date = buttonProps.day.date;
  const matched = tripsDays.filter((t) =>
    t.dates.some((d) => sameLocalDay(d, date)),
  );

  return (
    <div className="relative w-full">
      <CalendarDayButton {...buttonProps} />
      {matched.length > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0.5 left-1/2 flex -translate-x-1/2 items-center gap-0.5"
        >
          {matched.slice(0, MAX_VISIBLE_DOTS).map((t) => (
            <span
              key={t.tripId}
              className="size-1 rounded-full"
              style={{ backgroundColor: getTripColor(t.tripId).cssVar }}
            />
          ))}
          {matched.length > MAX_VISIBLE_DOTS && (
            <span className="text-[0.5rem] leading-none text-muted-foreground">
              +{matched.length - MAX_VISIBLE_DOTS}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
