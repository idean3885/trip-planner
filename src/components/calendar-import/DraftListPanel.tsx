"use client";

/**
 * spec 027 US1·US2·US3 — 외부 import draft 목록 + 승격·다시 가져오기·삭제.
 *
 * trip 상세 SidePanel 의 별도 섹션. PENDING 상태만 표시.
 * 카드 클릭 → 승격 모달. 컨텍스트 메뉴 → 다시 가져오기 / 삭제.
 */

import type {
  ActivityCategory,
  ActivityDraftStatus,
  CalendarProviderId,
} from "@prisma/client";
import { CalendarClock, Loader2, MoreHorizontal } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DraftDTO {
  id: number;
  tripId: number;
  provider: CalendarProviderId;
  externalCalendarId: string;
  externalEventId: string;
  title: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  locationText: string | null;
  description: string | null;
  startTimezone: string | null;
  endTimezone: string | null;
  status: ActivityDraftStatus;
}

const CATEGORY_OPTIONS: { value: ActivityCategory; label: string }[] = [
  { value: "SIGHTSEEING", label: "관광" },
  { value: "DINING", label: "식사" },
  { value: "TRANSPORT", label: "이동" },
  { value: "ACCOMMODATION", label: "숙소" },
  { value: "SHOPPING", label: "쇼핑" },
  { value: "OTHER", label: "기타" },
];
const TIMEZONE_OPTIONS = [
  "Asia/Seoul",
  "Asia/Tokyo",
  "Asia/Taipei",
  "Asia/Singapore",
  "Asia/Bangkok",
  "Europe/Paris",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

function formatRange(start: string, end: string, isAllDay: boolean): string {
  if (isAllDay) {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(start));
  }
  const fmt = new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${fmt.format(new Date(start))} ~ ${fmt.format(new Date(end))}`;
}

export default function DraftListPanel({
  tripId,
  canEdit,
}: {
  tripId: number;
  canEdit: boolean;
}) {
  const [drafts, setDrafts] = useState<DraftDTO[] | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<DraftDTO | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 폼 상태
  const [category, setCategory] = useState<ActivityCategory>("SIGHTSEEING");
  const [startTz, setStartTz] = useState<string>("Asia/Seoul");
  const [endTz, setEndTz] = useState<string>("Asia/Seoul");

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/trips/${tripId}/drafts?status=PENDING`, {
      cache: "no-store",
    });
    if (!res.ok) {
      setDrafts([]);
      return;
    }
    const data = await res.json();
    setDrafts(data.drafts as DraftDTO[]);
  }, [tripId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openPromote = useCallback((d: DraftDTO) => {
    setPromoteTarget(d);
    setCategory("SIGHTSEEING");
    setStartTz(d.startTimezone ?? "Asia/Seoul");
    setEndTz(d.endTimezone ?? d.startTimezone ?? "Asia/Seoul");
  }, []);

  const handlePromote = useCallback(async () => {
    if (!promoteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/trips/${tripId}/drafts/${promoteTarget.id}/promote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category,
            startTimezone: startTz,
            endTimezone: endTz,
          }),
        },
      );
      if (res.status === 422) {
        const body = await res.json();
        toast.error("필수 입력 누락", {
          description: `다음 필드를 채워주세요: ${body.fields.join(", ")}`,
        });
        return;
      }
      if (!res.ok) {
        toast.error("승격 실패", { description: `오류 코드 ${res.status}` });
        return;
      }
      toast.success("정식 일정으로 승격했습니다.");
      setPromoteTarget(null);
      await refresh();
      window.location.reload();
    } finally {
      setSubmitting(false);
    }
  }, [category, endTz, promoteTarget, refresh, startTz, tripId]);

  const handleRefreshDraft = useCallback(
    async (d: DraftDTO) => {
      const res = await fetch(`/api/trips/${tripId}/drafts/${d.id}/refresh`, {
        method: "POST",
      });
      if (res.status === 404) {
        toast.error("외부 이벤트가 없어졌습니다.", {
          description: "외부 캘린더에서 이벤트가 삭제된 것으로 보입니다.",
        });
        return;
      }
      if (!res.ok) {
        toast.error("다시 가져오기 실패", {
          description: `오류 코드 ${res.status}`,
        });
        return;
      }
      toast.success("외부 최신 값으로 갱신했습니다.");
      await refresh();
    },
    [refresh, tripId],
  );

  const handleDelete = useCallback(
    async (d: DraftDTO) => {
      if (
        !confirm(
          "이 초안을 삭제할까요? 외부 캘린더의 이벤트는 그대로 유지됩니다.",
        )
      )
        return;
      const res = await fetch(`/api/trips/${tripId}/drafts/${d.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("초안을 삭제했습니다.");
        await refresh();
      } else {
        toast.error("삭제 실패", { description: `오류 코드 ${res.status}` });
      }
    },
    [refresh, tripId],
  );

  if (!drafts || drafts.length === 0) return null;

  return (
    <section className="bg-card rounded-lg border p-4 shadow-sm">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <CalendarClock className="size-4" />
        외부에서 가져온 일정 ({drafts.length})
      </h3>
      <p className="text-muted-foreground mb-3 text-xs">
        클릭하면 카테고리·시간대를 채워 정식 일정으로 만들 수 있습니다.
      </p>
      <ul className="space-y-2">
        {drafts.map((d) => (
          <li
            key={d.id}
            className="bg-muted/30 flex items-start justify-between gap-2 rounded-md border border-dashed px-3 py-2"
          >
            <button
              className="flex-1 text-left disabled:cursor-not-allowed"
              onClick={() => canEdit && openPromote(d)}
              disabled={!canEdit}
            >
              <div className="text-sm font-medium opacity-80">{d.title}</div>
              <div className="text-muted-foreground text-xs">
                {formatRange(d.startTime, d.endTime, d.isAllDay)}
                {d.locationText ? ` · ${d.locationText}` : ""}
              </div>
              <div className="bg-muted text-muted-foreground mt-1 inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium">
                외부 캘린더에서 가져옴
              </div>
            </button>
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <span
                    className="text-muted-foreground hover:bg-accent inline-flex size-8 items-center justify-center rounded-md"
                    aria-label="더보기"
                  >
                    <MoreHorizontal className="size-4" />
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleRefreshDraft(d)}>
                    다시 가져오기
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(d)}
                    className="text-destructive"
                  >
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </li>
        ))}
      </ul>

      <Dialog
        open={promoteTarget !== null}
        onOpenChange={(o) => !o && setPromoteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>정식 일정으로 만들기</DialogTitle>
            <DialogDescription>{promoteTarget?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <label className="block">
              <span className="mb-1 block text-xs font-medium">카테고리</span>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as ActivityCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium">
                  시작 시간대
                </span>
                <Select
                  value={startTz}
                  onValueChange={(v) => v && setStartTz(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">
                  종료 시간대
                </span>
                <Select value={endTz} onValueChange={(v) => v && setEndTz(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPromoteTarget(null)}
              disabled={submitting}
            >
              취소
            </Button>
            <Button onClick={handlePromote} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  승격 중…
                </>
              ) : (
                "승격"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
