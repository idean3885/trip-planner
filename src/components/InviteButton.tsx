"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface InviteButtonProps {
  tripId: number;
}

export default function InviteButton({ tripId }: InviteButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleInvite(role: "HOST" | "GUEST") {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) throw new Error("초대 링크 생성 실패");

      const { inviteUrl } = await res.json();
      await navigator.clipboard.writeText(inviteUrl);
      toast.success(`${role === "HOST" ? "호스트" : "게스트"} 초대 링크가 복사되었습니다`);
    } catch {
      toast.error("초대 링크 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => handleInvite("HOST")} disabled={loading}>
        호스트 초대
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleInvite("GUEST")} disabled={loading}>
        게스트 초대
      </Button>
    </div>
  );
}
