"use client";

/**
 * spec 029 T021 + #595 T034 + spec 032 — 월별 미니 캘린더.
 *
 * 여행 derived 기간(start ~ end) 강조 + 오늘 강조 + 일정이 있는 날짜 dot.
 * `tripsDays` 가 주어지면 통합 캘린더 모드로 동작 — 각 trip 의 색 dot 을
 * 날짜 칸 하단에 같이 표시하기 위해 DayButton 을 custom render 한다. 단일
 * trip 사용 시 `tripsDays` 를 비워두면 hasActivity 단일 dot 으로 동작한다.
 *
 * spec 032 추가:
 * - `desktopFull` — 데스크탑 좌측 컬럼을 꽉 채우도록 폭/셀 크기를 확대한다.
 * - `enableMobileCompact` — 모바일에서 위로 스와이프 시 선택 주 1줄(주간
 *   스트립)로 압축, 아래로 스와이프 시 월 표시로 복귀한다. react-day-picker
 *   가 주간 표시를 직접 제공하지 않아 주간 스트립을 별도로 렌더한다.
 */

import * as React from "react";
import { useMemo, useRef, useState } from "react";
import { ko } from "react-day-picker/locale";
import type { Matcher } from "react-day-picker";

import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { getTripColor } from "@/lib/trip-palette";
import { cn } from "@/lib/utils";

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
  /** spec 032 — 데스크탑 좌측 컬럼을 꽉 채우도록 폭·셀 확대. */
  desktopFull?: boolean;
  /** spec 032 — 모바일 위/아래 스와이프로 월↔주 압축 토글 활성화. */
  enableMobileCompact?: boolean;
  className?: string;
}

function sameLocalDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

const MAX_VISIBLE_BARS = 3 as const;
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** date 가 속한 주(일요일 시작)의 7일을 반환. */
export function getWeekDays(date: Date): Date[] {
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - date.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

export function CalendarView({
  tripStart,
  tripEnd,
  daysDates,
  tripsDays,
  selected,
  onSelect,
  extraModifiers,
  extraModifierClassNames,
  desktopFull,
  enableMobileCompact,
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

  // spec 031 — 셀 하단에 가로 bar 를 그려 연속 일자를 시각적으로 연결한다.
  // `after:inset-x-0` 으로 셀 가로 너비 전체를 채우고, 인접 셀 hasActivity 가
  // 같은 위치/색이면 Google Calendar 멀티데이 이벤트처럼 한 줄로 이어 보인다.
  const modifiersClassNames: Record<string, string> = {
    tripRange: "bg-primary/10",
    ...(isMultiTrip
      ? {}
      : {
          hasActivity:
            "relative after:absolute after:bottom-1 after:inset-x-0 after:h-0.5 after:bg-primary",
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

  // spec 032 — 데스크탑 확대: 셀 크기를 키워 좌측 컬럼을 채운다(#645).
  // 셀은 정사각이라 셀 크기가 곧 세로 길이도 결정한다 — 너무 키우면 캘린더가
  // 화면을 잡아먹어 방해가 되므로 14(=3.5rem)로 상한을 둔다. 한 토큰만 조절하면
  // 가로 채움/세로 길이 균형을 바꿀 수 있다.
  const monthCalendar = (
    <Calendar
      mode="single"
      locale={ko}
      selected={selected}
      onSelect={onSelect}
      defaultMonth={defaultMonth}
      modifiers={modifiers}
      modifiersClassNames={modifiersClassNames}
      components={components}
      className={cn(
        desktopFull && "mx-auto w-full [--cell-size:--spacing(14)]",
        className,
      )}
    />
  );

  if (!enableMobileCompact) {
    return monthCalendar;
  }

  return (
    <MobileCompactCalendar
      monthCalendar={monthCalendar}
      tripStart={tripStart}
      tripEnd={tripEnd}
      daysDates={daysDates}
      selected={selected}
      onSelect={onSelect}
    />
  );
}

/**
 * spec 032 — 모바일 월↔주 압축. 위로 스와이프 시 선택 주 1줄(주간 스트립),
 * 아래로 스와이프 시 월 표시로 복귀한다. 선택 날짜가 바뀌면 압축 상태는
 * 유지하며 주만 새 날짜의 주로 따라간다.
 */
function MobileCompactCalendar({
  monthCalendar,
  tripStart,
  tripEnd,
  daysDates,
  selected,
  onSelect,
}: {
  monthCalendar: React.ReactNode;
  tripStart: Date | null;
  tripEnd: Date | null;
  daysDates: Date[];
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
}) {
  const [view, setView] = useState<"month" | "week">("month");
  const touchStartY = useRef<number | null>(null);

  // 세로 스와이프로 월↔주를 전환한다. react-swipeable 은 iOS Safari 가 세로
  // 제스처를 페이지 스크롤로 먼저 가져가 감지가 어려웠다(#637). 컨테이너에
  // touch-action: pan-x(`touch-pan-x`) 를 줘 브라우저가 세로 제스처를 가로채지
  // 않게 하고, touchstart↔touchend 의 Y 변화량으로 직접 판정한다.
  // 아래로(+) → 주(접기), 위로(−) → 월(펼치기). 기준 미달은 탭으로 간주해 무시.
  const SWIPE_THRESHOLD = 40;
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartY.current;
    touchStartY.current = null;
    if (start == null) return;
    const dy = (e.changedTouches[0]?.clientY ?? start) - start;
    if (dy > SWIPE_THRESHOLD) setView("week");
    else if (dy < -SWIPE_THRESHOLD) setView("month");
  };

  return (
    <div
      data-calendar-view={view}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      // touch-action 은 제스처 시작 요소 기준이라, 날짜 셀·주간 버튼(자식)에서
      // 시작한 세로 스와이프가 브라우저 스크롤로 새 위로 스와이프(주→월)가
      // 동작하지 않았다(#645). 자식 전체에 pan-x 를 줘 세로 제스처를 직접 받는다.
      className="touch-pan-x [&_*]:touch-pan-x"
    >
      {view === "month" ? (
        monthCalendar
      ) : (
        <WeekStrip
          selected={selected ?? new Date()}
          tripStart={tripStart}
          tripEnd={tripEnd}
          daysDates={daysDates}
          onSelect={onSelect}
        />
      )}
      {/* 스와이프가 어려운 환경에서도 월↔주 전환을 보장하는 명시적 탭 토글(#637). */}
      <button
        type="button"
        onClick={() => setView((v) => (v === "month" ? "week" : "month"))}
        aria-pressed={view === "week"}
        className="mt-1 flex w-full items-center justify-center rounded-md py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
      >
        {view === "month" ? "주간만 보기" : "월 전체 보기"}
      </button>
    </div>
  );
}

function WeekStrip({
  selected,
  tripStart,
  tripEnd,
  daysDates,
  onSelect,
}: {
  selected: Date;
  tripStart: Date | null;
  tripEnd: Date | null;
  daysDates: Date[];
  onSelect?: (date: Date | undefined) => void;
}) {
  const week = useMemo(() => getWeekDays(selected), [selected]);

  return (
    <div className="flex w-full gap-1 py-1" role="grid" aria-label="선택 주">
      {week.map((d) => {
        const isSelected = sameLocalDay(d, selected);
        const hasActivity = daysDates.some((x) => sameLocalDay(x, d));
        const inRange =
          tripStart && tripEnd ? d >= tripStart && d <= tripEnd : false;
        return (
          <button
            key={d.toISOString()}
            type="button"
            onClick={() => onSelect?.(d)}
            aria-pressed={isSelected}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-md py-1.5 text-sm transition-colors",
              isSelected
                ? "bg-primary text-primary-foreground"
                : inRange
                  ? "bg-primary/10 text-foreground"
                  : "text-foreground hover:bg-muted",
            )}
          >
            <span className="text-[0.65rem] opacity-70">
              {WEEKDAY_LABELS[d.getDay()]}
            </span>
            <span className="tabular-nums">{d.getDate()}</span>
            <span
              aria-hidden
              className={cn(
                "h-0.5 w-4 rounded-full",
                hasActivity
                  ? isSelected
                    ? "bg-primary-foreground"
                    : "bg-primary"
                  : "bg-transparent",
              )}
            />
          </button>
        );
      })}
    </div>
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

  // spec 031 — 다중 trip 모드 dot → 가로 bar 변경. 셀 가로 너비 전체에 stack 된
  // bar 가 그려지고, 인접 셀에 같은 trip 이 있으면 같은 색·높이의 bar 가 연결되어
  // 보인다 (셀 사이 gap 0 가정).
  return (
    <div className="relative w-full">
      <CalendarDayButton {...buttonProps} />
      {matched.length > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0.5 flex flex-col gap-px"
        >
          {matched.slice(0, MAX_VISIBLE_BARS).map((t) => (
            <span
              key={t.tripId}
              className="h-0.5 w-full"
              style={{ backgroundColor: getTripColor(t.tripId).cssVar }}
            />
          ))}
          {matched.length > MAX_VISIBLE_BARS && (
            <span className="text-[0.5rem] leading-none text-muted-foreground">
              +{matched.length - MAX_VISIBLE_BARS}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
