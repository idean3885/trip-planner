"use client";

/**
 * spec 029 T023 + T030~T033 통합 — 여행 상세 캘린더 + 일정 리스트 + 사이드
 * 트립 체크박스 레이아웃.
 *
 * desktop (≥1024px): 좌 캘린더 + 우 사이드(트립 체크박스 + 일정 리스트) split.
 * mobile (<1024px): 상단(체크박스 + 캘린더) + 하단 stacked. 하단은
 *   MobileSwipeShell 이 기본 DAY 목록과 선택 날짜 일정 swap.
 *
 * 사용자 prefs: 체크된 trip ID 는 localStorage(`user-prefs.readCheckedTripIds`)에
 * 보존. 마운트 시 prefs 복원, 토글 시 즉시 저장. 현재 trip 만 default 체크.
 *
 * v2.18.0 범위 한계: 다른 trip 의 일정 날짜는 캘린더 dot 단일 색 union 으로
 * 노출(이번 trip 과 동일 색). 색별 분리 dot + 일정 카드의 trip 라벨은 별도
 * follow-up 이슈에서 처리.
 *
 * viewport 분기점은 lg(1024px). `docs/glossary.md` 정본 따름.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ActivityCategory, ReservationStatus } from "@prisma/client";
import { formatCalendarDate } from "@/lib/date-utils";
import { Card, CardContent } from "@/components/ui/card";
import { readCheckedTripIds, writeCheckedTripIds } from "@/lib/user-prefs";
import { CalendarView } from "./CalendarView";
import { DayActivitiesPane, type PaneDay } from "./DayActivitiesPane";
import { MobileSwipeShell } from "./MobileSwipeShell";
import { TripCheckboxes, type TripCheckboxOption } from "./TripCheckboxes";

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
  /** 사용자가 속한 모든 trip 메타 (사이드 체크박스용). */
  userTrips: TripCheckboxOption[];
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
  userTrips,
}: TripDetailLayoutProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  /**
   * 체크된 trip ID set. 마운트 시 prefs 복원, 없으면 현재 trip 만.
   * 사용자 prefs 가 다른 기기에서 만들어졌고 현재 trip 이 미체크된 상태일
   * 수 있으므로 현재 trip 은 항상 union 으로 합쳐 강제 체크.
   */
  const [checkedTripIds, setCheckedTripIds] = useState<Set<number>>(
    () => new Set([tripId]),
  );

  // localStorage 는 외부 시스템 → 마운트 시 1회 동기화. SSR/CSR hydration
  // mismatch 회피를 위해 useState lazy init 가 아니라 effect 로 분리한다.
  useEffect(() => {
    const stored = readCheckedTripIds();
    const next = new Set<number>(stored);
    next.add(tripId);
    const allowed = new Set(userTrips.map((t) => t.id));
    for (const id of next) {
      if (!allowed.has(id)) next.delete(id);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCheckedTripIds(next);
  }, [tripId, userTrips]);

  const handleToggleTrip = useCallback(
    (id: number, checked: boolean) => {
      setCheckedTripIds((prev) => {
        const next = new Set(prev);
        if (checked) next.add(id);
        else next.delete(id);
        // 현재 trip 은 항상 강제 체크 — 자기 자신을 끌 수 없음
        next.add(tripId);
        writeCheckedTripIds(Array.from(next));
        return next;
      });
    },
    [tripId],
  );

  /**
   * 다른 trip 의 일정 날짜 캐시. 체크 on 시 lazy fetch, off 시 캐시 유지(다시
   * 켤 때 즉시 표시). 캐시 키 = tripId.
   */
  const [otherTripDates, setOtherTripDates] = useState<Map<number, Date[]>>(
    () => new Map(),
  );

  useEffect(() => {
    const toFetch = Array.from(checkedTripIds).filter(
      (id) => id !== tripId && !otherTripDates.has(id),
    );
    if (toFetch.length === 0) return;

    let cancelled = false;
    Promise.all(
      toFetch.map(async (id) => {
        try {
          const res = await fetch(`/api/v2/trips/${id}/days`);
          if (!res.ok) return null;
          const data: { date: string }[] = await res.json();
          return [id, data.map((d) => new Date(d.date))] as const;
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setOtherTripDates((prev) => {
        const next = new Map(prev);
        for (const r of results) {
          if (r) next.set(r[0], r[1]);
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [checkedTripIds, tripId, otherTripDates]);

  const ownDayDates = useMemo(
    () => days.map((d) => new Date(d.date)),
    [days],
  );

  /** 캘린더에 표시할 일정 날짜 union — 현재 trip + 체크된 다른 trip. */
  const daysDates = useMemo(() => {
    const out = [...ownDayDates];
    for (const id of checkedTripIds) {
      if (id === tripId) continue;
      const dates = otherTripDates.get(id);
      if (dates) out.push(...dates);
    }
    return out;
  }, [ownDayDates, checkedTripIds, tripId, otherTripDates]);

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

  const checkboxes = userTrips.length >= 2 ? (
    <Card>
      <CardContent className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground">
          내 여행 표시
        </h3>
        <TripCheckboxes
          trips={userTrips}
          checkedTripIds={checkedTripIds}
          onToggle={handleToggleTrip}
          className="space-y-1"
        />
      </CardContent>
    </Card>
  ) : null;

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
      <SidePlaceholder hasOwnSchedule={days.length > 0} />
    );

  // spec 029 T041 — 본인 trip 의 일정 0건이면 캘린더 상단에 안내. 캘린더
  // 자체는 노출하되 trip 기간 강조와 dot 없이 오늘만 강조된 상태로 보인다.
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
    <>
      {/* desktop split */}
      <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
        <div className="space-y-4">
          {emptyNotice}
          {calendarView}
        </div>
        <div className="space-y-4">
          {checkboxes}
          {sidePane}
        </div>
      </div>

      {/* mobile stacked + in-place swap */}
      <div className="space-y-4 lg:hidden">
        {checkboxes}
        {emptyNotice}
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

function SidePlaceholder({ hasOwnSchedule }: { hasOwnSchedule: boolean }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {hasOwnSchedule
            ? "캘린더에서 날짜를 선택하면 그 날의 일정이 표시됩니다."
            : "일정을 추가하면 이 영역에 그 날의 일정이 표시됩니다."}
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
