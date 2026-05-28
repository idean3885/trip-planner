"use client";

/**
 * spec 029 T022 — 선택된 날짜의 일정 리스트 pane.
 *
 * desktop split 의 사이드 영역과 mobile stacked 의 하단 영역에서 같은
 * 컴포넌트를 재사용한다. 선택 날짜에 Day 가 등록돼 있으면 활동 카드 요약 +
 * 일자 상세 진입 링크, 없으면 "이 날짜에 등록된 일정이 없습니다" 안내 +
 * (편집 권한자에게) 일정 추가 버튼.
 */

import Link from "next/link";
import type { ActivityCategory, ReservationStatus } from "@prisma/client";
import { formatCalendarDate } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AddDayButton from "@/components/AddDayButton";

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

export interface DayActivitiesPaneProps {
  tripId: number;
  /** 캘린더에서 선택된 날짜. */
  selectedDate: Date;
  /** 선택 날짜에 등록된 Day. 없으면 null. */
  day: PaneDay | null;
  /** 편집 권한 (GUEST=false). */
  canEdit: boolean;
  /** 트립의 derived 기간 — AddDayButton 의 날짜 범위 제약에 사용. */
  tripStart: Date;
  tripEnd: Date;
}

function formatHHMM(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function DayActivitiesPane({
  tripId,
  selectedDate,
  day,
  canEdit,
  tripStart,
  tripEnd,
}: DayActivitiesPaneProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium tabular-nums">
          {formatCalendarDate(selectedDate)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {day ? (
          <>
            <Link
              href={`/trips/${tripId}/day/${day.id}`}
              className="block text-sm font-medium text-foreground hover:underline"
            >
              {day.title || "일정 상세 보기"}
            </Link>
            {day.activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                일정이 등록되지 않았습니다.
              </p>
            ) : (
              <ul className="space-y-2">
                {day.activities.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-foreground">{a.title}</div>
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
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              이 날짜에 등록된 일정이 없습니다.
            </p>
            {canEdit && (
              <AddDayButton
                tripId={tripId}
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
