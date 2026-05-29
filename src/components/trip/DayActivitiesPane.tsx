"use client";

/**
 * spec 032 — 선택된 날짜의 일정 패널 (인라인 CRUD).
 *
 * 데스크탑 우측 하단 / 모바일 캘린더 아래에서 같은 컴포넌트를 재사용한다.
 * 선택 날짜에 매칭 Day 가 있으면 `ActivityList` 로 활동을 추가·수정·삭제하고,
 * Day 가 없으면 "일정 추가" 버튼으로 먼저 Day 를 생성(`POST /days`)한 뒤
 * 부모(`TripDetailLayout`)의 days 상태에 반영한다. 페이지 이동은 없다.
 */

import { useState } from "react";
import { toast } from "sonner";
import type { ActivityCategory, ReservationStatus } from "@prisma/client";
import { formatCalendarDate } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ActivityList from "@/components/ActivityList";

export interface PanelActivity {
  id: number;
  category: ActivityCategory;
  title: string;
  startTime: string | null;
  startTimezone?: string | null;
  endTime: string | null;
  endTimezone?: string | null;
  location: string | null;
  memo: string | null;
  cost: string | null;
  currency: string;
  reservationStatus: ReservationStatus | null;
  sortOrder: number;
}

export interface PanelDay {
  id: number;
  activities: PanelActivity[];
}

export interface DayCreatedPayload {
  id: number;
  date: string;
}

export interface DayActivitiesPaneProps {
  tripId: number;
  /** 캘린더에서 선택된 날짜. */
  selectedDate: Date;
  /** 선택 날짜에 매칭되는 Day. 없으면 null. */
  day: PanelDay | null;
  /** 편집 권한 (GUEST=false). */
  canEdit: boolean;
  /** 빈 날짜에서 Day 가 새로 생성되면 부모 days 상태에 반영하는 콜백. */
  onDayCreated: (day: DayCreatedPayload) => void;
}

/** Date 를 로컬 기준 YYYY-MM-DD 로 변환 (floating-time 관행 #232). */
function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DayActivitiesPane({
  tripId,
  selectedDate,
  day,
  canEdit,
  onDayCreated,
}: DayActivitiesPaneProps) {
  const [busy, setBusy] = useState(false);

  async function handleCreateDay() {
    setBusy(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/days`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: toYmd(selectedDate) }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(
          body.error === "duplicate_date"
            ? "이미 해당 날짜의 일정이 있습니다"
            : "일정 추가에 실패했습니다",
        );
        return;
      }
      const created = (await res.json()) as { id: number; date: string };
      onDayCreated({ id: created.id, date: created.date });
    } catch {
      toast.error("일정 추가 중 오류가 발생했습니다");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium tabular-nums">
          {formatCalendarDate(selectedDate)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {day ? (
          <ActivityList
            tripId={tripId}
            dayId={day.id}
            activities={day.activities}
            canEdit={canEdit}
          />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              이 날짜에 등록된 일정이 없습니다.
            </p>
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCreateDay}
                disabled={busy}
              >
                + 일정 추가
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
