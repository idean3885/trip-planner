"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface Props {
  tripId: number;
  /** @deprecated spec 041 — 날짜 입력 범위 제한을 없앴으나(과거·미래 자유 추가)
   * 호출부 호환을 위해 선택 prop 으로 남겨둔다. 사용하지 않는다. */
  tripStartDate?: string;
  tripEndDate?: string;
}

/**
 * spec 041 — "일정 변경". 날짜를 자유롭게(과거·미래) 추가하면 서버가 여행 기간을
 * 그에 맞춰 파생 확장한다(#296). 기존 날짜 입력 min/max 제한이 시작일 이전 날짜를
 * 막아 "범위 벗어남" 오류를 내던 것을 제거했다. 기간은 Day 의 최소·최대에서
 * 파생되므로(명목 컬럼 없음, spec 029) 별도 기간 필드 변경은 없다.
 */
export default function AddDayButton({ tripId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

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
        toast.error(
          body.error === "duplicate_date"
            ? "이미 해당 날짜의 일정이 있습니다"
            : "일정 변경에 실패했습니다",
        );
        return;
      }
      toast.success("여행 일정을 변경했습니다");
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
        일정 변경
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      {/* spec 041 — min/max 제거: 시작일 이전·종료일 이후 날짜도 추가 가능. */}
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
        className="border-border bg-background rounded-md border px-2 py-1 text-sm tabular-nums"
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
