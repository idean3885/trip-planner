"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface LeaveTripButtonProps {
  tripId: number;
  tripTitle: string;
}

export default function LeaveTripButton({ tripId, tripTitle }: LeaveTripButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLeave() {
    const confirmed = window.confirm(
      `"${tripTitle}" 여행에서 나가시겠습니까?\n다시 합류하려면 호스트의 초대 링크가 필요합니다.`,
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/leave`, { method: "POST" });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "탈퇴 실패" }));
        throw new Error(error || "탈퇴 실패");
      }
      router.push("/");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "여행 탈퇴에 실패했습니다.");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLeave}
      disabled={loading}
      className="rounded-md px-3 py-1.5 text-body-sm font-medium text-surface-600 border border-surface-200 hover:bg-surface-50 disabled:opacity-50"
    >
      {loading ? "나가는 중..." : "여행 나가기"}
    </button>
  );
}
