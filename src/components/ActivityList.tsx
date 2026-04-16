"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ActivityCategory, ReservationStatus, Prisma } from "@prisma/client";
import ActivityCard from "./ActivityCard";
import ActivityForm, { type ActivityFormData } from "./ActivityForm";

function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  if (value.includes("T")) {
    const d = new Date(value);
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  }
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

    const res = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("생성 실패");

    const created = await res.json();
    setActivities((prev) => [...prev, created]);
    setShowForm(false);
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

    const res = await fetch(`${apiBase}/${activityId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("수정 실패");

    const updated = await res.json();
    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? updated : a))
    );
    setEditingId(null);
  }

  async function handleDelete(activityId: number) {
    if (!confirm("이 활동을 삭제하시겠습니까?")) return;

    const res = await fetch(`${apiBase}/${activityId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("삭제 실패");

    setActivities((prev) => prev.filter((a) => a.id !== activityId));
  }

  async function handleMove(activityId: number, direction: "up" | "down") {
    const idx = activities.findIndex((a) => a.id === activityId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
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
        <h2 className="text-heading-sm font-semibold text-surface-700">
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
            className="w-full rounded-card border border-dashed border-surface-300 py-2.5 text-body-sm text-surface-400 hover:border-surface-400 hover:text-surface-600 transition-colors"
          >
            + 활동 추가
          </button>
        )
      )}
    </div>
  );
}
