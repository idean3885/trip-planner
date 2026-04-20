"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Props {
  tripId: number;
  tripStartDate: string;
  tripEndDate: string;
}

/**
 * 여행 상세 페이지의 '일정' 섹션에서 Day(날짜)를 새로 추가한다.
 * Trip 범위 밖 날짜 입력 시 서버가 범위를 자동 확장한다(#296 거동).
 */
export default function AddDayButton({ tripId, tripStartDate, tripEndDate }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  const minDate = tripStartDate.slice(0, 10);
  const maxDate = tripEndDate.slice(0, 10);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/days`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error === "duplicate_date" ? "이미 해당 날짜의 일정이 있습니다" : "일정 추가에 실패했습니다");
        return;
      }
      toast.success("일정을 추가했습니다");
      setOpen(false);
      setDate("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        + 일정 추가
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        min={minDate}
        max={maxDate}
        required
        className="rounded-md border border-border bg-background px-2 py-1 text-sm tabular-nums"
      />
      <Button type="submit" size="sm" disabled={busy || !date}>
        추가
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => {
          setOpen(false);
          setDate("");
        }}
      >
        취소
      </Button>
    </form>
  );
}
