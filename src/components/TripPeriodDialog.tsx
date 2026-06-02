"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Props {
  tripId: number;
  /** 현재 여행 시작일(파생). 일정 0건이면 null. */
  currentStart: Date | null;
  /** 현재 여행 종료일(파생). 일정 0건이면 null. */
  currentEnd: Date | null;
}

interface WouldDelete {
  totalActivities: number;
  dayCount: number;
}

/** UTC 자정 Date → date input 값("YYYY-MM-DD"). */
function toInputValue(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

/**
 * spec 043 US1 — "일정 변경". 여행 기간(시작일~종료일)을 직접 지정·수정한다.
 * 기간을 늘리면 서버가 경계 Day 를 생성하고, 줄이면 범위 밖 Day·활동을 삭제한다.
 * 삭제될 활동이 있으면 서버가 409 로 막고, 사용자가 경고를 확인하면 confirm 으로
 * 재요청해 삭제한다. 손실이 없으면 한 번에 적용된다.
 */
export default function TripPeriodDialog({
  tripId,
  currentStart,
  currentEnd,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(() => toInputValue(currentStart));
  const [end, setEnd] = useState(() => toInputValue(currentEnd));
  const [busy, setBusy] = useState(false);
  const [warn, setWarn] = useState<WouldDelete | null>(null);

  function resetFromProps() {
    setStart(toInputValue(currentStart));
    setEnd(toInputValue(currentEnd));
    setWarn(null);
  }

  async function submit(confirm: boolean) {
    if (!start || !end) {
      toast.error("시작일과 종료일을 입력하세요");
      return;
    }
    if (start > end) {
      toast.error("시작일이 종료일보다 늦을 수 없습니다");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/period`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: start, endDate: end, confirm }),
      });
      if (res.status === 409) {
        const body = (await res.json()) as WouldDelete;
        setWarn({
          totalActivities: body.totalActivities,
          dayCount: body.dayCount,
        });
        return;
      }
      if (!res.ok) {
        toast.error("기간 변경에 실패했습니다");
        return;
      }
      toast.success("여행 기간을 변경했습니다");
      setWarn(null);
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) resetFromProps();
      }}
    >
      <DialogTrigger
        render={<Button type="button" variant="outline" size="sm" />}
      >
        일정 변경
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>여행 기간 변경</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">시작일</span>
            <input
              type="date"
              value={start}
              max={end || undefined}
              onChange={(e) => {
                setStart(e.target.value);
                setWarn(null);
              }}
              className="border-border bg-background rounded-md border px-2 py-1 text-sm tabular-nums"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">종료일</span>
            <input
              type="date"
              value={end}
              min={start || undefined}
              onChange={(e) => {
                setEnd(e.target.value);
                setWarn(null);
              }}
              className="border-border bg-background rounded-md border px-2 py-1 text-sm tabular-nums"
            />
          </label>
          {warn && (
            <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
              새 기간을 벗어나는 일자 {warn.dayCount}개에 활동{" "}
              {warn.totalActivities}건이 함께 삭제됩니다. 되돌릴 수 없습니다.
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose
            render={<Button type="button" variant="ghost" disabled={busy} />}
          >
            취소
          </DialogClose>
          {warn ? (
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => submit(true)}
            >
              {busy ? "삭제 중…" : "삭제하고 적용"}
            </Button>
          ) : (
            <Button type="button" disabled={busy} onClick={() => submit(false)}>
              {busy ? "적용 중…" : "적용"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
