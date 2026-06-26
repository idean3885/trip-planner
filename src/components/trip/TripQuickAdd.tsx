"use client";

/**
 * spec #846 — 떠 있는 단일 "활동 추가" 진입점.
 *
 * 일정 화면은 스와이프 캐러셀(transform·overflow) 안이라 그 안의 sticky/fixed 가
 * 갇힌다. 그래서 추가 컨트롤을 캐러셀 밖(레이아웃 레벨)으로 올려, 화면 하단에
 * `fixed` + 높은 z-index 로 항상 떠 있게 둔다. 누르면 간소 폼이 바텀시트로 열려
 * 스크롤 위치와 무관하게 한 탭으로 추가한다. 저장하면 폼을 비운 채 유지(연속 추가).
 *
 * 선택 일자에 Day 가 없으면 먼저 생성한 뒤 활동을 추가한다(빈 날짜도 한 번에).
 */

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { Activity } from "@/components/ActivityList";
import ActivityForm, { type ActivityFormData } from "@/components/ActivityForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PaymentTiming } from "@prisma/client";

/** Date → 로컬 기준 YYYY-MM-DD (floating-time 관행 #232, DayActivitiesPane 와 동일). */
function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    /* c8 ignore next */
    return "UTC";
  }
}

export function TripQuickAdd({
  tripId,
  selectedDate,
  dayId,
  timingDefault,
  onDayCreated,
  onActivityCreated,
}: {
  tripId: number;
  /** 추가 대상 일자(현재 선택일). */
  selectedDate: Date;
  /** 선택일의 Day id. null 이면 추가 시 Day 를 먼저 만든다. */
  dayId: number | null;
  timingDefault?: PaymentTiming;
  onDayCreated: (payload: { id: number; date: string }) => void;
  onActivityCreated: (dayId: number, created: Activity) => void;
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // 이중 제출은 ActivityForm 의 saving 상태가 막는다(제출 버튼 비활성).
  async function handleSubmit(data: ActivityFormData) {
    try {
      let id = dayId;
      // 빈 날짜면 Day 먼저 생성.
      if (id == null) {
        const res = await fetch(`/api/trips/${tripId}/days`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: toYmd(selectedDate) }),
        });
        if (!res.ok) {
          toast.error("일정 추가에 실패했습니다");
          return;
        }
        const day = (await res.json()) as { id: number; date: string };
        onDayCreated({ id: day.id, date: day.date });
        id = day.id;
      }

      const tz = browserTimezone();
      const body: Record<string, unknown> = {
        category: data.category,
        title: data.title,
      };
      if (data.startTime) {
        body.startTime = data.startTime;
        body.startTimezone = tz;
      }
      if (data.endTime) {
        body.endTime = data.endTime;
        body.endTimezone = tz;
      }
      if (data.location) body.location = data.location;
      if (data.memo) body.memo = data.memo;
      if (data.url) body.url = data.url;
      if (data.cost) body.cost = parseFloat(data.cost);
      if (data.currency) body.currency = data.currency;
      body.paymentTiming = data.paymentTiming;
      body.allDay = data.allDay;

      const res = await fetch(`/api/trips/${tripId}/days/${id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast.error("활동 생성에 실패했습니다");
        return;
      }
      const created = (await res.json()) as Activity;
      onActivityCreated(id, created);
      // 폼을 비운 채 유지 → 연속 추가(현장 빠른 기록).
      setFormKey((k) => k + 1);
      toast.success("일정을 추가했습니다");
    } catch {
      toast.error("활동 생성 중 오류가 발생했습니다");
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="활동 추가"
        onClick={() => setOpen(true)}
        className="bg-foreground text-background hover:bg-foreground/90 fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-1/2 z-50 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full px-5 py-3 text-sm font-medium shadow-lg transition-colors"
      >
        <Plus className="size-4" aria-hidden />
        활동 추가
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>활동 추가</DialogTitle>
          </DialogHeader>
          <ActivityForm
            key={formKey}
            onSubmit={handleSubmit}
            onCancel={() => setOpen(false)}
            timingDefault={timingDefault}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
