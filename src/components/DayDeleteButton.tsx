"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface DayDeleteButtonProps {
  tripId: number;
  dayId: number;
}

export default function DayDeleteButton({
  tripId,
  dayId,
}: DayDeleteButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        "이 일자를 삭제할까요? 일자에 등록된 모든 활동도 함께 삭제됩니다. 되돌릴 수 없습니다.",
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/days/${dayId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error("삭제 실패", {
          description: body?.error ?? `오류 코드: ${res.status}`,
        });
        return;
      }
      toast.success("일자를 삭제했습니다.");
      router.push(`/trips/${tripId}`);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={deleting}
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
    >
      {deleting ? "삭제 중…" : "일자 삭제"}
    </Button>
  );
}
