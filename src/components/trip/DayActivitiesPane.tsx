"use client";

/**
 * spec 029 T022 + #595 T035 — 선택된 날짜의 일정 리스트 pane.
 *
 * desktop split 의 사이드 영역과 mobile stacked 의 하단 영역에서 같은
 * 컴포넌트를 재사용한다. 다중 trip 모드에서는 `groups` 에 trip 별 일정을
 * 묶어 넘기면 각 trip 의 색 라벨 + 일정 카드를 분리 노출한다. 단일 trip
 * 모드는 groups 길이 1 로 호출 — 라벨은 자동으로 숨겨진다.
 *
 * 일정 0건 day 처리: 현재 trip 의 day 가 null 이면 "이 날짜에 일정이
 * 없습니다" + AddDayButton(권한자). 다른 trip 의 null day 는 노이즈라 skip.
 */

import Link from "next/link";
import type { ActivityCategory, ReservationStatus } from "@prisma/client";
import { formatCalendarDate } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AddDayButton from "@/components/AddDayButton";
import { getTripColor } from "@/lib/trip-palette";

export interface PaneActivity {
  id: number;
  title: string;
  category: ActivityCategory;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  reservationStatus: ReservationStatus | null;
}

export interface PaneDay {
  id: number;
  title: string | null;
  activities: PaneActivity[];
}

export interface DayActivitiesGroup {
  tripId: number;
  tripTitle: string;
  /** 선택 날짜에 해당 trip 에 등록된 Day. 없으면 null. */
  day: PaneDay | null;
}

export interface DayActivitiesPaneProps {
  /** 사용자가 현재 보고 있는 trip 의 ID. AddDayButton 노출 분기에 사용. */
  currentTripId: number;
  /** 캘린더에서 선택된 날짜. */
  selectedDate: Date;
  /** trip 별 일정 그룹. 단일 trip 모드는 길이 1. */
  groups: DayActivitiesGroup[];
  /** 편집 권한 (GUEST=false). 현재 trip 기준. */
  canEdit: boolean;
  /** 현재 trip 의 derived 기간 — AddDayButton 날짜 범위 제약. */
  tripStart: Date;
  tripEnd: Date;
}

function formatHHMM(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function DayActivitiesPane({
  currentTripId,
  selectedDate,
  groups,
  canEdit,
  tripStart,
  tripEnd,
}: DayActivitiesPaneProps) {
  const isMulti = groups.length >= 2;
  // 다중 trip 모드는 day 있는 그룹만 표시(다른 trip 의 빈 day 는 노이즈 skip).
  const visibleGroups = isMulti
    ? groups.filter((g) => g.day !== null)
    : groups;
  const currentGroup = groups.find((g) => g.tripId === currentTripId);
  const currentEmpty = !currentGroup?.day;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium tabular-nums">
          {formatCalendarDate(selectedDate)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {visibleGroups.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              이 날짜에 등록된 일정이 없습니다.
            </p>
            {canEdit && (
              <AddDayButton
                tripId={currentTripId}
                tripStartDate={tripStart.toISOString()}
                tripEndDate={tripEnd.toISOString()}
              />
            )}
          </div>
        ) : (
          <ul className="space-y-4">
            {visibleGroups.map((g) =>
              g.day ? (
                <li key={g.tripId} className="space-y-2">
                  {isMulti && (
                    <TripLabel tripId={g.tripId} title={g.tripTitle} />
                  )}
                  <Link
                    href={`/trips/${g.tripId}/day/${g.day.id}`}
                    className="block text-sm font-medium text-foreground hover:underline"
                  >
                    {g.day.title || "일정 상세 보기"}
                  </Link>
                  {g.day.activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      일정이 등록되지 않았습니다.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {g.day.activities.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-foreground">
                              {a.title}
                            </div>
                            {a.location && (
                              <div className="truncate text-xs text-muted-foreground">
                                {a.location}
                              </div>
                            )}
                          </div>
                          {a.startTime && (
                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                              {formatHHMM(a.startTime)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ) : null,
            )}
          </ul>
        )}

        {/* 다중 trip 모드에서 현재 trip 만 비어 있으면 안내 + (편집 권한자만) 추가 버튼.
            GUEST 도 안내 텍스트는 노출 — 어느 여행이 비어 있는지 인지하게 함. */}
        {isMulti && currentEmpty && visibleGroups.length > 0 && (
          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              현재 여행에는 이 날짜에 일정이 없습니다.
            </p>
            {canEdit && (
              <AddDayButton
                tripId={currentTripId}
                tripStartDate={tripStart.toISOString()}
                tripEndDate={tripEnd.toISOString()}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TripLabel({ tripId, title }: { tripId: number; title: string }) {
  const color = getTripColor(tripId);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        aria-hidden
        className="size-2 rounded-full"
        style={{ backgroundColor: color.cssVar }}
      />
      <span className="font-medium text-muted-foreground">{title}</span>
    </span>
  );
}
