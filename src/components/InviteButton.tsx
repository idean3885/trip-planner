"use client";

import { useState } from "react";

interface InviteButtonProps {
  tripId: number;
}

export default function InviteButton({ tripId }: InviteButtonProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleInvite(role: "HOST" | "GUEST") {
    setLoading(true);
    setCopied(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) throw new Error("초대 링크 생성 실패");

      const { inviteUrl } = await res.json();
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(role === "HOST" ? "호스트" : "게스트");
      setTimeout(() => setCopied(null), 3000);
    } catch {
      alert("초대 링크 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleInvite("HOST")}
        disabled={loading}
        className="rounded-md px-3 py-1.5 text-body-sm font-medium text-surface-700 border border-surface-200 hover:bg-surface-50 disabled:opacity-50"
      >
        호스트 초대
      </button>
      <button
        onClick={() => handleInvite("GUEST")}
        disabled={loading}
        className="rounded-md px-3 py-1.5 text-body-sm font-medium text-surface-700 border border-surface-200 hover:bg-surface-50 disabled:opacity-50"
      >
        게스트 초대
      </button>
      {copied && (
        <span className="text-body-sm text-primary-600">
          {copied} 초대 링크 복사됨
        </span>
      )}
    </div>
  );
}
