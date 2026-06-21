"use client";

import type {
  ActivityCategory,
  Prisma,
  ReservationStatus,
} from "@prisma/client";
import { useState } from "react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";

import ActivityCard from "./ActivityCard";
import ActivityForm, { type ActivityFormData } from "./ActivityForm";

function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  if (value.includes("T")) {
    const d = new Date(value);
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  }
  /* c8 ignore next -- defensive passthrough: DB는 ISO(Timestamptz)만 저장하므로
     T 미포함 값은 도달 불가. 타입 폭(string)을 방어적으로 대응한 코드. */
  return value;
}

export interface Activity {
  id: number;
  category: ActivityCategory;
  title: string;
  startTime: string | null;
  startTimezone?: string | null;
  endTime: string | null;
  endTimezone?: string | null;
  location: string | null;
  memo: string | null;
  url?: string | null;
  cost: Prisma.Decimal | string | number | null;
  currency: string;
  reservationStatus: ReservationStatus | null;
  allDay?: boolean;
  sortOrder: number;
}

interface ActivityListProps {
  tripId: number;
  dayId: number;
  activities: Activity[];
  canEdit: boolean;
  /**
   * CRUD 결과를 상위 캐시에 반영하는 콜백(#669). dayId 를 함께 넘겨 상위가
   * 패널마다 클로저를 새로 만들지 않고 단일 안정 핸들러를 쓰게 한다(#673 memo).
   */
  onActivitiesChange?: (dayId: number, next: Activity[]) => void;
}

export default function ActivityList({
  tripId,
  dayId,
  activities: initialActivities,
  canEdit,
  onActivitiesChange,
}: ActivityListProps) {
  const [activities, setActivities] = useState(initialActivities);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  // spec 048 — 카드 탭 → 상세(읽기 전용) → 편집 2단계. viewingId 가 상세 대상.
  const [viewingId, setViewingId] = useState<number | null>(null);

  const apiBase = `/api/trips/${tripId}/days/${dayId}/activities`;

  // 로컬 상태 갱신 + 상위 캐시 통지(#669). 날짜를 오가도 편집이 캐시에 남는다.
  function commit(next: Activity[]) {
    setActivities(next);
    onActivitiesChange?.(dayId, next);
  }

  /**
   * 브라우저의 IANA 타임존 감지(#341). Activity 저장 시 startTime/endTime과
   * 함께 전송해 ActivityCard가 KST 등 약어를 붙일 수 있게 한다.
   * SSR 시 window 없음 대비해 함수 호출부에서만 평가한다.
   */
  function getBrowserTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      /* c8 ignore next -- defensive: 모든 현대 브라우저가 Intl을 지원. 테스트 도달 불가 */
      return "UTC";
    }
  }

  async function handleCreate(data: ActivityFormData) {
    const tz = getBrowserTimezone();
    const body: Record<string, unknown> = {
      category: data.category,
      title: data.title,
    };
    if (data.startTime) {
      body.startTime = data.startTime;
      body.startTimezone = tz;
    }
    if (data.endTime) {
      body.endTime = data.endTime;
      body.endTimezone = tz;
    }
    if (data.location) body.location = data.location;
    if (data.memo) body.memo = data.memo;
    if (data.url) body.url = data.url;
    if (data.cost) body.cost = parseFloat(data.cost);
    if (data.currency) body.currency = data.currency;
    if (data.reservationStatus) body.reservationStatus = data.reservationStatus;
    body.allDay = data.allDay;

    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast.error("활동 생성에 실패했습니다");
        return;
      }
      const created = await res.json();
      commit([...activities, created]);
      setShowForm(false);
      toast.success("일정을 추가했습니다");
    } catch {
      toast.error("활동 생성 중 오류가 발생했습니다");
    }
  }

  async function handleUpdate(activityId: number, data: ActivityFormData) {
    const tz = getBrowserTimezone();
    const body: Record<string, unknown> = {
      category: data.category,
      title: data.title,
      startTime: data.startTime || null,
      startTimezone: data.startTime ? tz : null,
      endTime: data.endTime || null,
      endTimezone: data.endTime ? tz : null,
      location: data.location || null,
      memo: data.memo || null,
      url: data.url || null,
      cost: data.cost ? parseFloat(data.cost) : null,
      currency: data.currency,
      reservationStatus: data.reservationStatus || null,
      allDay: data.allDay,
    };

    try {
      const res = await fetch(`${apiBase}/${activityId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast.error("활동 수정에 실패했습니다");
        return;
      }
      const updated = await res.json();
      commit(activities.map((a) => (a.id === activityId ? updated : a)));
      setEditingId(null);
      toast.success("일정을 수정했습니다");
    } catch {
      toast.error("활동 수정 중 오류가 발생했습니다");
    }
  }

  async function handleDelete(activityId: number) {
    if (!confirm("이 활동을 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`${apiBase}/${activityId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("활동 삭제에 실패했습니다");
        return;
      }
      commit(activities.filter((a) => a.id !== activityId));
      toast.success("일정을 삭제했습니다");
    } catch {
      toast.error("활동 삭제 중 오류가 발생했습니다");
    }
  }

  async function handleMove(activityId: number, direction: "up" | "down") {
    const idx = activities.findIndex((a) => a.id === activityId);
    /* c8 ignore next -- defensive: UI는 렌더된 activity의 id만 전달 */
    if (idx < 0) return;
    // #740 — 같은 종일 분류 안에서만 인접 항목과 교환(종일↔시간 그룹 경계는 넘지
    // 않는다). 다른 분류 항목은 건너뛰며 가장 가까운 동일 분류 이웃을 찾는다.
    const step = direction === "up" ? -1 : 1;
    const sameClass = (a: Activity) => !!a.allDay === !!activities[idx].allDay;
    let swapIdx = idx + step;
    while (
      swapIdx >= 0 &&
      swapIdx < activities.length &&
      !sameClass(activities[swapIdx])
    ) {
      swapIdx += step;
    }
    /* c8 ignore next -- defensive: ActivityCard의 isFirst/isLast가 경계 버튼을 숨김 */
    if (swapIdx < 0 || swapIdx >= activities.length) return;

    const reordered = [...activities];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    commit(reordered);

    const orderedIds = reordered.map((a) => a.id);
    await fetch(apiBase, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    });
  }

  // #740 — 종일/시간 두 묶음으로 분리. 종일은 최상단 별도 섹션(기본 접힘).
  const allDayItems = activities.filter((a) => a.allDay);
  const timedItems = activities.filter((a) => !a.allDay);

  const renderItem = (
    activity: Activity,
    isFirst: boolean,
    isLast: boolean,
  ) => {
    const initial = {
      category: activity.category,
      title: activity.title,
      startTime: formatTime(activity.startTime),
      endTime: formatTime(activity.endTime),
      location: activity.location ?? "",
      memo: activity.memo ?? "",
      url: activity.url ?? "",
      cost: activity.cost ? String(activity.cost) : "",
      currency: activity.currency,
      reservationStatus: activity.reservationStatus ?? "",
      allDay: activity.allDay ?? false,
    };
    // 편집 > 상세 > 카드 우선순위.
    if (editingId === activity.id) {
      return (
        <ActivityForm
          key={activity.id}
          isEdit
          initial={initial}
          onSubmit={(data) => handleUpdate(activity.id, data)}
          onCancel={() => setEditingId(null)}
        />
      );
    }
    if (viewingId === activity.id) {
      return (
        <ActivityForm
          key={activity.id}
          readOnly
          initial={initial}
          onCancel={() => setViewingId(null)}
          onEdit={
            canEdit
              ? () => {
                  setViewingId(null);
                  setEditingId(activity.id);
                }
              : undefined
          }
        />
      );
    }
    return (
      <ActivityCard
        key={activity.id}
        activity={activity}
        canEdit={canEdit}
        isFirst={isFirst}
        isLast={isLast}
        onView={() => setViewingId(activity.id)}
        onDelete={() => handleDelete(activity.id)}
        onMoveUp={() => handleMove(activity.id, "up")}
        onMoveDown={() => handleMove(activity.id, "down")}
      />
    );
  };

  return (
    <div className="space-y-2">
      {allDayItems.length > 0 && (
        <details className="border-border bg-card/50 rounded-lg border">
          <summary className="text-foreground cursor-pointer px-3 py-2 text-sm font-semibold tracking-tight select-none">
            종일 ({allDayItems.length})
          </summary>
          <div className="space-y-2 px-2 pb-2">
            {allDayItems.map((activity, idx) =>
              renderItem(activity, idx === 0, idx === allDayItems.length - 1),
            )}
          </div>
        </details>
      )}

      {timedItems.length > 0 && (
        <h2 className="text-foreground text-sm font-semibold tracking-tight">
          활동 ({timedItems.length})
        </h2>
      )}
      {timedItems.map((activity, idx) =>
        renderItem(activity, idx === 0, idx === timedItems.length - 1),
      )}

      {/* spec 058 — 활동 0건이면 빈 상태를 카드로 보여 비어 있음을 분명히 한다
          (로딩 스켈레톤은 DayActivitiesPane 가 별도로 처리해 구분 유지). */}
      {activities.length === 0 && !showForm && (
        <Card>
          <CardContent className="text-muted-foreground py-6 text-center text-sm">
            등록된 활동이 없습니다.
          </CardContent>
        </Card>
      )}

      {showForm ? (
        <ActivityForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        canEdit && (
          <button
            onClick={() => setShowForm(true)}
            className="border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground w-full rounded-xl border border-dashed py-2.5 text-sm transition-colors"
          >
            + 활동 추가
          </button>
        )
      )}
    </div>
  );
}
