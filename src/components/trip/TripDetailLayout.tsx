"use client";

/**
 * spec 029 T023 + T030~T033 + #595 통합 — 여행 상세 캘린더 + 일정 리스트 +
 * 사이드 트립 체크박스 + 다중 trip 색 dot + trip 라벨 통합.
 *
 * desktop (≥1024px): 좌 캘린더 + 우 사이드(트립 체크박스 + 일정 리스트) split.
 * mobile (<1024px): 상단(체크박스 + 캘린더) + 하단 stacked. 하단은
 *   MobileSwipeShell 이 기본 DAY 목록과 선택 날짜 일정 swap.
 *
 * 사용자 prefs: 체크된 trip ID 는 localStorage(`user-prefs.readCheckedTripIds`)에
 * 보존. 마운트 시 prefs 복원, 토글 시 즉시 저장. 현재 trip 만 default 체크.
 *
 * 다중 trip 모드(체크된 trip ≥ 2):
 *   - 캘린더: trip 별 색 dot 분리 노출 (`CalendarView.tripsDays`)
 *   - 사이드 일정 카드: 각 trip 별 라벨 + 일정 표시 (`DayActivitiesPane.groups`)
 *   - 다른 trip 의 days+activities 는 GET /api/v2/trips/<id> lazy fetch
 *
 * viewport 분기점은 lg(1024px). `docs/glossary.md` 정본 따름.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ActivityCategory, ReservationStatus } from "@prisma/client";
import { formatCalendarDate } from "@/lib/date-utils";
import { Card, CardContent } from "@/components/ui/card";
import { readCheckedTripIds, writeCheckedTripIds } from "@/lib/user-prefs";
import { CalendarView, type TripDayGroup } from "./CalendarView";
import {
  DayActivitiesPane,
  type DayActivitiesGroup,
  type PaneActivity,
} from "./DayActivitiesPane";
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
   * 다른 trip 의 trip 메타 + days(+activities) 캐시. #595 에서 단순 dates 만
   * 받던 캐시를 trip 단건 응답(`GET /api/v2/trips/<id>`)으로 확장 — 사이드
   * 일정 카드에 trip 라벨 + 활동 통합 노출 위함. off 시 캐시 유지(재체크 즉시
   * 표시). 캐시 키 = tripId.
   */
  const [otherTripsCache, setOtherTripsCache] = useState<
    Map<number, { title: string; days: LayoutDay[] }>
  >(() => new Map());

  useEffect(() => {
    const toFetch = Array.from(checkedTripIds).filter(
      (id) => id !== tripId && !otherTripsCache.has(id),
    );
    if (toFetch.length === 0) return;

    let cancelled = false;
    Promise.all(
      toFetch.map(async (id) => {
        try {
          const res = await fetch(`/api/v2/trips/${id}`);
          if (!res.ok) return null;
          const data: {
            title: string;
            days: {
              id: number;
              date: string;
              title: string | null;
              dayNumber: number;
              activities: PaneActivity[];
            }[];
          } = await res.json();
          const layoutDays: LayoutDay[] = data.days.map((d) => ({
            id: d.id,
            date: d.date,
            title: d.title,
            dayNumber: d.dayNumber,
            activities: d.activities ?? [],
          }));
          return [id, { title: data.title, days: layoutDays }] as const;
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setOtherTripsCache((prev) => {
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
  }, [checkedTripIds, tripId, otherTripsCache]);

  const ownDayDates = useMemo(
    () => days.map((d) => new Date(d.date)),
    [days],
  );

  /** 캘린더에 표시할 일정 날짜 union — 단일 trip 모드 fallback 용. */
  const daysDates = useMemo(() => {
    const out = [...ownDayDates];
    for (const id of checkedTripIds) {
      if (id === tripId) continue;
      const cached = otherTripsCache.get(id);
      if (cached) out.push(...cached.days.map((d) => new Date(d.date)));
    }
    return out;
  }, [ownDayDates, checkedTripIds, tripId, otherTripsCache]);

  /**
   * 다중 trip 모드(체크된 trip ≥ 2)일 때 CalendarView 에 trip 별 dates 를
   * 분리 전달해 색 dot 노출. 단일 trip 모드는 빈 배열 → CalendarView 가
   * hasActivity 단일 dot 으로 자동 fallback.
   */
  const tripsDaysForCalendar = useMemo<TripDayGroup[]>(() => {
    if (checkedTripIds.size < 2) return [];
    const out: TripDayGroup[] = [];
    if (checkedTripIds.has(tripId)) {
      out.push({ tripId, dates: ownDayDates });
    }
    for (const id of checkedTripIds) {
      if (id === tripId) continue;
      const cached = otherTripsCache.get(id);
      if (cached) {
        out.push({ tripId: id, dates: cached.days.map((d) => new Date(d.date)) });
      }
    }
    return out;
  }, [checkedTripIds, tripId, ownDayDates, otherTripsCache]);

  /** 선택 날짜에 해당하는 trip 별 day 그룹. DayActivitiesPane 입력. */
  const dayGroups = useMemo<DayActivitiesGroup[]>(() => {
    if (!selectedDate) return [];
    const out: DayActivitiesGroup[] = [];
    for (const id of checkedTripIds) {
      if (id === tripId) {
        const ownDay = days.find((d) =>
          sameLocalDay(new Date(d.date), selectedDate),
        );
        out.push({
          tripId,
          tripTitle: userTrips.find((t) => t.id === tripId)?.title ?? "여행",
          day: ownDay
            ? {
                id: ownDay.id,
                title: ownDay.title,
                activities: ownDay.activities,
              }
            : null,
        });
      } else {
        const cached = otherTripsCache.get(id);
        if (!cached) continue;
        const matched = cached.days.find((d) =>
          sameLocalDay(new Date(d.date), selectedDate),
        );
        out.push({
          tripId: id,
          tripTitle: cached.title,
          day: matched
            ? {
                id: matched.id,
                title: matched.title,
                activities: matched.activities,
              }
            : null,
        });
      }
    }
    return out;
  }, [
    selectedDate,
    checkedTripIds,
    tripId,
    days,
    userTrips,
    otherTripsCache,
  ]);

  const calendarView = (
    <CalendarView
      tripStart={tripStart}
      tripEnd={tripEnd}
      daysDates={daysDates}
      tripsDays={tripsDaysForCalendar}
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
        currentTripId={tripId}
        selectedDate={selectedDate}
        groups={dayGroups}
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
                currentTripId={tripId}
                selectedDate={selectedDate}
                groups={dayGroups}
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
