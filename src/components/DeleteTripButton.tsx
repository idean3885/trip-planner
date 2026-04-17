"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeleteTripButtonProps {
  tripId: number;
  tripTitle: string;
}

export default function DeleteTripButton({ tripId, tripTitle }: DeleteTripButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    const confirmed = window.confirm(
      `"${tripTitle}" 여행을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며, 모든 일정과 활동이 함께 삭제됩니다.`,
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "삭제 실패" }));
        throw new Error(error || "삭제 실패");
      }
      router.push("/");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "여행 삭제에 실패했습니다.");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="rounded-md px-3 py-1.5 text-body-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50"
    >
      {loading ? "삭제 중..." : "여행 삭제"}
    </button>
  );
}
