"use client";

/**
 * spec 031 — /trips 좌측 통합 캘린더.
 *
 * 사용자가 속한 모든 trip 의 일자를 한 캘린더에 모아 색별 가로 bar 로 노출한다.
 * 셀 클릭 시 해당 일자에 일정이 있는 trip 의 상세 페이지로 이동한다. 같은 셀에
 * 둘 이상의 trip 이 겹치면 가장 가까운 미래(또는 동일 날짜면 가장 최근 생성)
 * trip 으로 이동 — spec 031 Clarification 3 결정.
 */

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CalendarView, type TripDayGroup } from "./CalendarView";

export interface TripsCalendarTrip {
  id: number;
  /** 시간순으로 정렬 가능하도록 ISO 문자열로 전달. */
  createdAt: string;
  /** trip 이 보유한 모든 day.date (ISO). */
  dates: string[];
}

export interface TripsCalendarProps {
  trips: TripsCalendarTrip[];
}

function sameLocalDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

/**
 * 같은 셀에 여러 trip 이 겹칠 때 라우팅 target 을 결정한다.
 *
 * 1. 매칭 trip 0 개 → null (라우팅 안 함).
 * 2. 1 개 → 그 trip.
 * 3. ≥ 2 개 → 셀 날짜 기준으로 시작일이 가장 가까운 미래 trip. 동일 날짜면
 *    `createdAt` 이 가장 최근 trip.
 *
 * 두 trip 이 동시에 진행 중(둘 다 셀 날짜 이전에 시작)인 경우 distance 가
 * 모두 음수가 되며, 절댓값이 작은(= 시작일이 더 최근인) trip 이 선택된다.
 * spec 031 Clarification 3 "1차 단순화" 결정 — 셀 내 trip 선택 메뉴는 후속.
 */
export function resolveTargetTrip(
  cellDate: Date,
  trips: TripsCalendarTrip[],
): TripsCalendarTrip | null {
  const matched = trips.filter((t) =>
    t.dates.some((iso) => sameLocalDay(new Date(iso), cellDate)),
  );
  if (matched.length === 0) return null;
  if (matched.length === 1) return matched[0];

  // 가장 가까운 미래(>= cellDate)를 startDate 가진 trip 우선. 시작일이 cellDate
  // 이전이면 후순위. 후보 sort: distance asc, createdAt desc.
  const ranked = matched
    .map((t) => {
      const start = t.dates
        .map((iso) => new Date(iso))
        .sort((a, b) => a.getTime() - b.getTime())[0];
      const distance = start.getTime() - cellDate.getTime();
      return { trip: t, distance, createdAt: new Date(t.createdAt).getTime() };
    })
    .sort((a, b) => {
      // 미래(distance >= 0) 가 과거(distance < 0) 보다 우선.
      const aFuture = a.distance >= 0 ? 0 : 1;
      const bFuture = b.distance >= 0 ? 0 : 1;
      if (aFuture !== bFuture) return aFuture - bFuture;
      // 같은 그룹 안에서 거리 절댓값이 작은 trip 우선.
      const ad = Math.abs(a.distance);
      const bd = Math.abs(b.distance);
      if (ad !== bd) return ad - bd;
      // 거리 동률이면 가장 최근 생성 trip.
      return b.createdAt - a.createdAt;
    });
  return ranked[0].trip;
}

export function TripsCalendar({ trips }: TripsCalendarProps) {
  const router = useRouter();

  const tripsDays = useMemo<TripDayGroup[]>(
    () =>
      trips.map((t) => ({
        tripId: t.id,
        dates: t.dates.map((iso) => new Date(iso)),
      })),
    [trips],
  );

  // CalendarView 의 단일 dot fallback 을 막기 위해 (다중 trip 모드 강제) 빈 단일
  // 날짜 배열을 넘긴다. 통합 캘린더는 항상 trip 별 색 bar 로 표시한다.
  const handleSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) return;
      const target = resolveTargetTrip(date, trips);
      if (!target) return;
      router.push(`/trips/${target.id}`);
    },
    [trips, router],
  );

  return (
    <CalendarView
      tripStart={null}
      tripEnd={null}
      daysDates={[]}
      tripsDays={tripsDays}
      onSelect={handleSelect}
    />
  );
}
