"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActivityCategory, ReservationStatus, Prisma } from "@prisma/client";
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

interface Activity {
  id: number;
  category: ActivityCategory;
  title: string;
  startTime: string | null;
  startTimezone?: string | null;
  endTime: string | null;
  endTimezone?: string | null;
  location: string | null;
  memo: string | null;
  cost: Prisma.Decimal | string | number | null;
  currency: string;
  reservationStatus: ReservationStatus | null;
  sortOrder: number;
}

interface ActivityListProps {
  tripId: number;
  dayId: number;
  activities: Activity[];
  canEdit: boolean;
}

export default function ActivityList({
  tripId,
  dayId,
  activities: initialActivities,
  canEdit,
}: ActivityListProps) {
  const router = useRouter();
  const [activities, setActivities] = useState(initialActivities);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const apiBase = `/api/trips/${tripId}/days/${dayId}/activities`;

  async function handleCreate(data: ActivityFormData) {
    const body: Record<string, unknown> = {
      category: data.category,
      title: data.title,
    };
    if (data.startTime) body.startTime = data.startTime;
    if (data.endTime) body.endTime = data.endTime;
    if (data.location) body.location = data.location;
    if (data.memo) body.memo = data.memo;
    if (data.cost) body.cost = parseFloat(data.cost);
    if (data.currency) body.currency = data.currency;
    if (data.reservationStatus) body.reservationStatus = data.reservationStatus;

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
      setActivities((prev) => [...prev, created]);
      setShowForm(false);
    } catch {
      toast.error("활동 생성 중 오류가 발생했습니다");
    }
  }

  async function handleUpdate(activityId: number, data: ActivityFormData) {
    const body: Record<string, unknown> = {
      category: data.category,
      title: data.title,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      location: data.location || null,
      memo: data.memo || null,
      cost: data.cost ? parseFloat(data.cost) : null,
      currency: data.currency,
      reservationStatus: data.reservationStatus || null,
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
      setActivities((prev) =>
        prev.map((a) => (a.id === activityId ? updated : a))
      );
      setEditingId(null);
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
      setActivities((prev) => prev.filter((a) => a.id !== activityId));
    } catch {
      toast.error("활동 삭제 중 오류가 발생했습니다");
    }
  }

  async function handleMove(activityId: number, direction: "up" | "down") {
    const idx = activities.findIndex((a) => a.id === activityId);
    /* c8 ignore next -- defensive: UI는 렌더된 activity의 id만 전달 */
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    /* c8 ignore next -- defensive: ActivityCard의 isFirst/isLast가 경계 버튼을 숨김 */
    if (swapIdx < 0 || swapIdx >= activities.length) return;

    const reordered = [...activities];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    setActivities(reordered);

    const orderedIds = reordered.map((a) => a.id);
    await fetch(apiBase, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    });
  }

  return (
    <div className="space-y-2">
      {activities.length > 0 && (
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          활동 ({activities.length})
        </h2>
      )}

      {activities.map((activity, idx) =>
        editingId === activity.id ? (
          <ActivityForm
            key={activity.id}
            isEdit
            initial={{
              category: activity.category,
              title: activity.title,
              startTime: formatTime(activity.startTime),
              endTime: formatTime(activity.endTime),
              location: activity.location ?? "",
              memo: activity.memo ?? "",
              cost: activity.cost ? String(activity.cost) : "",
              currency: activity.currency,
              reservationStatus: activity.reservationStatus ?? "",
            }}
            onSubmit={(data) => handleUpdate(activity.id, data)}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <ActivityCard
            key={activity.id}
            activity={activity}
            canEdit={canEdit}
            isFirst={idx === 0}
            isLast={idx === activities.length - 1}
            onEdit={() => setEditingId(activity.id)}
            onDelete={() => handleDelete(activity.id)}
            onMoveUp={() => handleMove(activity.id, "up")}
            onMoveDown={() => handleMove(activity.id, "down")}
          />
        )
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
            className="w-full rounded-xl border border-dashed border-border bg-background py-2.5 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
          >
            + 활동 추가
          </button>
        )
      )}
    </div>
  );
}
