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

import { addDays, addMonths } from "date-fns";
import * as React from "react";
import { useMemo, useState } from "react";
import type { Matcher } from "react-day-picker";
import { ko } from "react-day-picker/locale";

import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { getTripColor } from "@/lib/trip-palette";
import { cn } from "@/lib/utils";

import { SwipeCarousel } from "./SwipeCarousel";

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
  /**
   * spec 040 — 날짜(toDateString) → Day 제목 맵. desktopFull(넓은 셀)에서 일정
   * 있는 날에 제목을 노출한다. 제목이 없으면 도트로 폴백. 모바일은 항상 도트.
   */
  dayTitles?: Map<string, string | null>;
  /** spec 032 — 모바일 위/아래 스와이프로 월↔주 압축 토글 활성화. */
  enableMobileCompact?: boolean;
  /** spec 051 — 스크롤로 캘린더가 상단 고정되면 주간으로 강제 접힘. */
  collapsed?: boolean;
  /**
   * spec 061 US3 — 여행 중에는 모바일 진입 시 주간 뷰를 기본으로 둔다. 사용자가
   * 토글하기 전 초기값에만 영향(이후 토글·스크롤 접힘은 그대로 동작).
   */
  defaultWeekView?: boolean;
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
  dayTitles,
  enableMobileCompact,
  collapsed,
  defaultWeekView,
  className,
}: CalendarViewProps) {
  const isMultiTrip = (tripsDays?.length ?? 0) > 0;
  // spec 040 — 데스크탑 넓은 셀은 custom DayButton 이 제목/도트를 직접 그린다.
  const singleDesktop = !isMultiTrip && !!desktopFull;

  const tripRange: Matcher | undefined =
    tripStart && tripEnd ? { from: tripStart, to: tripEnd } : undefined;

  const modifiers: Record<string, Matcher | Matcher[]> = {
    ...(tripRange ? { tripRange } : {}),
    // 다중 trip·데스크탑 단일 모드에서는 dot/제목을 custom DayButton 이 그리므로
    // hasActivity modifier 를 제거해 중복 노출을 막는다(모바일 단일만 modifier dot).
    ...(isMultiTrip || singleDesktop ? {} : { hasActivity: daysDates }),
    ...(extraModifiers ?? {}),
  };

  // spec 068 — 일정 있는 날은 셀 하단 중앙에 점(dot)으로 표시한다. 과거 연속 연결
  // 바(spec 031)는 글래스 톤에 과해 점으로 절제한다.
  const modifiersClassNames: Record<string, string> = {
    // spec 055 — 디자인은 여행기간 셀에 배경 채움을 두지 않고 텍스트로만 강조한다.
    // `.cal-range` 마커만 부여하면 globals.css `.trip-cal` 규칙이 평일=진한 본문색·
    // 볼드, 주말(주 첫/끝 칸)=여행주말 초록으로 칠한다.
    tripRange: "cal-range",
    ...(isMultiTrip || singleDesktop
      ? {}
      : {
          hasActivity:
            "relative after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-[var(--cal-activity-bar)]",
        }),
    ...(extraModifierClassNames ?? {}),
  };

  // #653 — 좌우 스와이프/네비로 표시 월을 바꾸려면 month 를 제어해야 한다.
  // 선택 날짜가 바뀌면(날짜 탭·주 스와이프·일 스와이프) 표시 월도 그 달로 맞춘다.
  // effect 대신 렌더 중 조정(React 권장 "prop 변화 시 state 보정") 패턴을 쓴다.
  const [displayMonth, setDisplayMonth] = useState<Date>(
    () => selected ?? tripStart ?? new Date(),
  );
  const [syncedSelected, setSyncedSelected] = useState<Date | undefined>(
    selected,
  );
  if (selected && selected !== syncedSelected) {
    setSyncedSelected(selected);
    setDisplayMonth(selected);
  }

  const components = isMultiTrip
    ? {
        DayButton: (
          dayProps: React.ComponentProps<typeof CalendarDayButton>,
        ) => <MultiTripDayButton tripsDays={tripsDays!} {...dayProps} />,
      }
    : singleDesktop
      ? {
          DayButton: (
            dayProps: React.ComponentProps<typeof CalendarDayButton>,
          ) => (
            <SingleTripDayButton
              daysDates={daysDates}
              dayTitles={dayTitles}
              {...dayProps}
            />
          ),
        }
      : undefined;

  // spec 032 — 데스크탑 확대: 셀 크기를 키워 좌측 컬럼을 채운다(#645).
  // 셀은 정사각이라 셀 크기가 곧 세로 길이도 결정한다 — 너무 키우면 캘린더가
  // 화면을 잡아먹어 방해가 되므로 14(=3.5rem)로 상한을 둔다. 한 토큰만 조절하면
  // 가로 채움/세로 길이 균형을 바꿀 수 있다.
  // 한 달치 캘린더 렌더러. 캐러셀은 이전·현재·다음 달을 같은 렌더러로 그린다.
  // withNav=false(핍 슬라이드)는 prev/next 화살표를 비활성(컨트롤드, 핸들러 없음).
  const renderMonth = (month: Date, withNav: boolean) => (
    <Calendar
      mode="single"
      locale={ko}
      selected={selected}
      onSelect={onSelect}
      month={month}
      onMonthChange={withNav ? setDisplayMonth : undefined}
      modifiers={modifiers}
      modifiersClassNames={modifiersClassNames}
      components={components}
      className={cn(
        // spec 055 — Figma 디자인 재색을 위한 스코프 마커. globals.css `.trip-cal`
        // 규칙이 요일 헤더(일=초록·토=파랑)·여행기간 강조·선택·오늘 색을 입힌다.
        "trip-cal",
        // spec 040/043 — 데스크탑 가로 grow: 컨테이너를 채우되(root w-full) 좌우
        // 약간 여백을 두고, max-w 로 폭 상한을 둬 셀(aspect-square)이 과대해지며
        // 세로가 화면을 잡아먹는 것을 막는다(#721 — 가로 빔/세로 과대 동시 해소).
        desktopFull && "mx-auto w-full max-w-2xl px-1",
        className,
      )}
    />
  );

  if (!enableMobileCompact) {
    return renderMonth(displayMonth, true);
  }

  return (
    <MobileCompactCalendar
      renderMonth={renderMonth}
      tripStart={tripStart}
      tripEnd={tripEnd}
      daysDates={daysDates}
      selected={selected}
      onSelect={onSelect}
      displayMonth={displayMonth}
      onMonthChange={setDisplayMonth}
      collapsed={collapsed}
      defaultWeekView={defaultWeekView}
    />
  );
}

/**
 * spec 032 — 모바일 월↔주 압축. 위로 스와이프 시 선택 주 1줄(주간 스트립),
 * 아래로 스와이프 시 월 표시로 복귀한다. 선택 날짜가 바뀌면 압축 상태는
 * 유지하며 주만 새 날짜의 주로 따라간다.
 */
function MobileCompactCalendar({
  renderMonth,
  tripStart,
  tripEnd,
  daysDates,
  selected,
  onSelect,
  displayMonth,
  onMonthChange,
  collapsed,
  defaultWeekView,
}: {
  renderMonth: (month: Date, withNav: boolean) => React.ReactNode;
  tripStart: Date | null;
  tripEnd: Date | null;
  daysDates: Date[];
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  displayMonth: Date;
  onMonthChange: (month: Date) => void;
  collapsed?: boolean;
  defaultWeekView?: boolean;
}) {
  // spec 061 US3 — 여행 중에는 주간 뷰로 진입한다(서버 판정값). 이후 사용자
  // 토글·스크롤 접힘은 기존대로 동작하며 초기값에만 영향을 준다.
  const [view, setView] = useState<"month" | "week">(
    defaultWeekView ? "week" : "month",
  );
  // spec 051 — 스크롤로 상단 고정되면(collapsed) 사용자 토글과 무관하게 주간으로
  // 강제 접고, 풀리면 사용자 토글값(기본 월간)으로 복원한다.
  const effectiveView = collapsed ? "week" : view;
  const selectedSafe = selected ?? new Date();

  // #657 — 드래그-팔로우 + 앞뒤 핍 스와이프(embla). 월 뷰는 달을, 주 뷰는 주를
  // 이전·현재·다음 3슬라이드로 끌어 넘긴다. 정착하면 기준을 옮기고 가운데로 복귀.
  // embla 가 세로 제스처를 통과시키고 SwipeCarousel 이 touch-pan-y 도 줘 세로
  // 페이지 스크롤은 그대로(#649 회귀 방지).
  return (
    <div data-calendar-view={effectiveView}>
      {effectiveView === "month" ? (
        <SwipeCarousel
          ariaLabel="월 달력"
          anchorKey={`m${displayMonth.getFullYear()}-${displayMonth.getMonth()}`}
          onCommit={(dir) => onMonthChange(addMonths(displayMonth, dir))}
          renderSlide={(off) =>
            renderMonth(addMonths(displayMonth, off), off === 0)
          }
          // spec — 트랙 높이를 현재 달에 맞춘다. 없으면 flex 트랙이 이웃 달(6주)
          // 높이로 커져 5주짜리 현재 달 아래에 빈 행이 떠 보인다(주간만 보기 위 공백).
          syncHeight
        />
      ) : (
        <SwipeCarousel
          ariaLabel="주 달력"
          anchorKey={`w${selectedSafe.toDateString()}`}
          onCommit={(dir) =>
            // spec — 주를 넘기면 같은 요일이 아니라 이동한 주의 첫 요일(일요일)을
            // 선택해 그 주를 처음부터 보게 한다(#738).
            onSelect?.(getWeekDays(addDays(selectedSafe, dir * 7))[0])
          }
          renderSlide={(off) => (
            <WeekStrip
              weekOf={addDays(selectedSafe, off * 7)}
              selected={off === 0 ? selectedSafe : undefined}
              tripStart={tripStart}
              tripEnd={tripEnd}
              daysDates={daysDates}
              onSelect={onSelect}
            />
          )}
        />
      )}
      {/* 스와이프가 어려운 환경에서도 월↔주 전환을 보장하는 명시적 탭 토글(#637).
          spec 051 — 스크롤로 자동 접힌(collapsed) 동안은 자동 제어 중이라 토글을 숨긴다. */}
      {!collapsed && (
        <button
          type="button"
          onClick={() => setView((v) => (v === "month" ? "week" : "month"))}
          aria-pressed={view === "week"}
          className="text-muted-foreground hover:bg-muted mt-1 flex w-full items-center justify-center rounded-md py-1.5 text-xs transition-colors"
        >
          {view === "month" ? "주간만 보기" : "월 전체 보기"}
        </button>
      )}
    </div>
  );
}

function WeekStrip({
  weekOf,
  selected,
  tripStart,
  tripEnd,
  daysDates,
  onSelect,
}: {
  /** 표시할 주(이 날짜가 속한 주). 핍 슬라이드는 선택일과 다른 주를 그린다. */
  weekOf: Date;
  /** 강조할 선택일. 핍 슬라이드는 undefined → 강조 없음. */
  selected?: Date;
  tripStart: Date | null;
  tripEnd: Date | null;
  daysDates: Date[];
  onSelect?: (date: Date | undefined) => void;
}) {
  const week = useMemo(() => getWeekDays(weekOf), [weekOf]);

  return (
    <div className="flex w-full gap-1 py-1" role="grid" aria-label="선택 주">
      {week.map((d) => {
        const isSelected = selected ? sameLocalDay(d, selected) : false;
        const hasActivity = daysDates.some((x) => sameLocalDay(x, d));
        const inRange =
          tripStart && tripEnd ? d >= tripStart && d <= tripEnd : false;
        const dow = d.getDay();
        const isWeekend = dow === 0 || dow === 6;
        const isToday = sameLocalDay(d, new Date());
        // spec 055 — 월 그리드와 동일한 디자인 색 체계를 주간 스트립에도 적용한다:
        // 선택=연녹 배경, 여행기간 주말=초록·평일=진한 본문색(볼드), 기간 밖=비활성 그레이,
        // 오늘(비선택)=테두리 박스. 요일 라벨도 일=초록·토=파랑.
        return (
          <button
            key={d.toISOString()}
            type="button"
            onClick={() => onSelect?.(d)}
            aria-pressed={isSelected}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-md py-1.5 text-sm transition-colors",
              isSelected
                ? "text-foreground bg-[var(--cal-selected-glass)] font-semibold ring-1 ring-[var(--cal-ring)] ring-inset"
                : inRange
                  ? isWeekend
                    ? "text-cal-trip-weekend font-semibold"
                    : "text-foreground hover:bg-muted font-semibold"
                  : "text-cal-inactive hover:bg-muted",
              !isSelected &&
                isToday &&
                "shadow-[inset_0_0_0_1.5px_var(--cal-ring)]",
            )}
          >
            <span
              className={cn(
                "text-[0.65rem]",
                dow === 0
                  ? "text-cal-sunday"
                  : dow === 6
                    ? "text-cal-saturday"
                    : "text-cal-weekday-header",
              )}
            >
              {WEEKDAY_LABELS[dow]}
            </span>
            <span className="tabular-nums">{d.getDate()}</span>
            <span
              aria-hidden
              className={cn(
                "size-1 rounded-full",
                hasActivity ? "bg-[var(--cal-activity-bar)]" : "bg-transparent",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

/**
 * spec 040 — 데스크탑 단일 trip 셀. 일정 있는 날에 Day 제목이 있으면 셀 하단에
 * 제목(말줄임)을, 제목이 없으면 도트(가로 bar)를 그린다. 넓은 셀에서만 쓰인다
 * (모바일은 modifier dot). 색은 디자인 토큰(primary)만 사용한다.
 */
function SingleTripDayButton({
  daysDates,
  dayTitles,
  ...buttonProps
}: React.ComponentProps<typeof CalendarDayButton> & {
  daysDates: Date[];
  dayTitles?: Map<string, string | null>;
}) {
  const date = buttonProps.day.date;
  const hasActivity = daysDates.some((d) => sameLocalDay(d, date));
  const title = dayTitles?.get(date.toDateString()) ?? null;

  return (
    <div className="relative w-full">
      <CalendarDayButton {...buttonProps} />
      {hasActivity &&
        (title ? (
          <span
            className="text-primary pointer-events-none absolute inset-x-1 bottom-1 truncate text-[0.6rem] leading-tight"
            title={title}
          >
            {title}
          </span>
        ) : (
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-[var(--cal-activity-bar)]"
          />
        ))}
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
            <span className="text-muted-foreground text-[0.5rem] leading-none">
              +{matched.length - MAX_VISIBLE_BARS}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
