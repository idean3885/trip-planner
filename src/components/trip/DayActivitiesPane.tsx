"use client";

/**
 * spec 032 — 선택된 날짜의 일정 패널 (인라인 CRUD).
 *
 * 데스크탑 우측 하단 / 모바일 캘린더 아래에서 같은 컴포넌트를 재사용한다.
 * 선택 날짜에 매칭 Day 가 있으면 `ActivityList` 로 활동을 추가·수정·삭제하고,
 * Day 가 없으면 "일정 추가" 버튼으로 먼저 Day 를 생성(`POST /days`)한 뒤
 * 부모(`TripDetailLayout`)의 days 상태에 반영한다. 페이지 이동은 없다.
 */

import { memo, useState } from "react";
import { toast } from "sonner";

import ActivityList, { type Activity } from "@/components/ActivityList";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCalendarDate } from "@/lib/date-utils";

export interface DayCreatedPayload {
  id: number;
  date: string;
}

export interface DayActivitiesPaneProps {
  tripId: number;
  /** 캘린더에서 선택된 날짜. */
  selectedDate: Date;
  /** 선택 날짜의 Day id. null = Day 미생성(빈 날짜). */
  dayId: number | null;
  /**
   * 그 Day 의 활동(캐시 참조). null = Day 는 있으나 아직 활동 미로딩(스켈레톤,
   * #669). 참조가 그대로면 memo 가 재렌더를 건너뛴다(#673).
   */
  activities: Activity[] | null;
  /** 편집 권한 (GUEST=false). */
  canEdit: boolean;
  /** 빈 날짜에서 Day 가 새로 생성되면 부모 인덱스에 반영하는 콜백. */
  onDayCreated: (day: DayCreatedPayload) => void;
  /** 활동 CRUD 결과를 상위 캐시에 반영(#669). dayId 동반 단일 안정 핸들러(#673). */
  onActivitiesChange?: (dayId: number, next: Activity[]) => void;
  /**
   * 상단 날짜 헤더 표시 여부(#681). 모바일은 캘린더 강조와 중복이라 숨긴다.
   * 데스크탑 2분할은 우측 일정에 날짜 맥락이 필요해 기본값(true)으로 유지한다.
   */
  showDateHeader?: boolean;
}

/** Date 를 로컬 기준 YYYY-MM-DD 로 변환 (floating-time 관행 #232). */
function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// React.memo — 다른 날짜의 일정이 프리페치로 도착해도, 이 패널의 dayId·activities
// 참조가 그대로면 재렌더를 건너뛴다(#673). props 는 모두 안정 참조로 전달된다.
export const DayActivitiesPane = memo(function DayActivitiesPane({
  tripId,
  selectedDate,
  dayId,
  activities,
  canEdit,
  onDayCreated,
  onActivitiesChange,
  showDateHeader = true,
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
      {showDateHeader && (
        <CardHeader>
          <CardTitle className="text-sm font-medium tabular-nums">
            {formatCalendarDate(selectedDate)}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {dayId === null ? (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
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
        ) : activities === null ? (
          // #669 — Day 는 있으나 아직 활동을 안 받음(윈도우 밖). 도착하면 채워진다.
          <div
            className="space-y-2"
            role="status"
            aria-label="일정 불러오는 중"
          >
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
          </div>
        ) : (
          // key={dayId} — 날짜를 바꾸면 ActivityList 를 새 Day 의 활동으로 다시
          // 마운트한다(#645). 활동은 상위 캐시에서 오고 CRUD 는 캐시로 통지(#669).
          <ActivityList
            key={dayId}
            tripId={tripId}
            dayId={dayId}
            activities={activities}
            canEdit={canEdit}
            onActivitiesChange={onActivitiesChange}
          />
        )}
      </CardContent>
    </Card>
  );
});
