"use client";

/**
 * spec 028 섹션 3 — draft 목록·승격·refresh·삭제.
 *
 * v2.15.1 `DraftListPanel` 의 동작을 inline 흡수. 같은 다이얼로그 내부에서 승격 폼이
 * 펼쳐지며 별도 모달 없음.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import type {
  ActivityCategory,
  ActivityDraftStatus,
  CalendarProviderId,
  ReservationStatus,
} from "@prisma/client";

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
const RESERVATION_OPTIONS: { value: ReservationStatus; label: string }[] = [
  { value: "REQUIRED", label: "사전 예약 필수" },
  { value: "RECOMMENDED", label: "사전 예약 권장" },
  { value: "ON_SITE", label: "현장 구매" },
  { value: "NOT_NEEDED", label: "예약 불필요" },
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

interface Props {
  tripId: number;
  canEdit: boolean;
  onMutated: () => void;
}

export default function DraftSection({ tripId, canEdit, onMutated }: Props) {
  const [drafts, setDrafts] = useState<DraftDTO[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [promoteTarget, setPromoteTarget] = useState<DraftDTO | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [category, setCategory] = useState<ActivityCategory>("SIGHTSEEING");
  const [reservationStatus, setReservationStatus] = useState<ReservationStatus>("NOT_NEEDED");
  const [startTz, setStartTz] = useState<string>("Asia/Seoul");
  const [endTz, setEndTz] = useState<string>("Asia/Seoul");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/drafts?status=PENDING`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setDrafts([]);
        return;
      }
      const data = await res.json();
      setDrafts(data.drafts as DraftDTO[]);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openPromote = useCallback((d: DraftDTO) => {
    if (!canEdit) return;
    setPromoteTarget(d);
    setCategory("SIGHTSEEING");
    setReservationStatus("NOT_NEEDED");
    setStartTz(d.startTimezone ?? "Asia/Seoul");
    setEndTz(d.endTimezone ?? d.startTimezone ?? "Asia/Seoul");
  }, [canEdit]);

  const handlePromote = useCallback(async () => {
    if (!promoteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/drafts/${promoteTarget.id}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          reservationStatus,
          startTimezone: startTz,
          endTimezone: endTz,
        }),
      });
      if (res.status === 422) {
        const body = await res.json();
        toast.error("필수 입력 누락", { description: `필드: ${body.fields.join(", ")}` });
        return;
      }
      if (!res.ok) {
        toast.error("승격 실패", { description: `오류 코드 ${res.status}` });
        return;
      }
      toast.success("정식 일정으로 승격했습니다.");
      setPromoteTarget(null);
      await refresh();
      onMutated();
    } finally {
      setSubmitting(false);
    }
  }, [category, endTz, onMutated, promoteTarget, refresh, reservationStatus, startTz, tripId]);

  const handleRefreshDraft = useCallback(
    async (d: DraftDTO) => {
      const res = await fetch(`/api/trips/${tripId}/drafts/${d.id}/refresh`, { method: "POST" });
      if (res.status === 404) {
        toast.error("외부 이벤트가 없어졌습니다.");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error("다시 가져오기 실패", {
          description: body?.message ?? `오류 코드 ${res.status}`,
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
      if (!confirm("이 초안을 삭제할까요? 외부 캘린더의 이벤트는 그대로 유지됩니다.")) return;
      const res = await fetch(`/api/trips/${tripId}/drafts/${d.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("초안을 삭제했습니다.");
        await refresh();
        onMutated();
      } else {
        toast.error("삭제 실패", { description: `오류 코드 ${res.status}` });
      }
    },
    [onMutated, refresh, tripId],
  );

  if (loading && drafts === null) {
    return null;
  }

  // draft 0건이면 섹션 자체를 숨긴다. 다이얼로그의 <details> summary가 이미
  // 가져오기 진입점을 안내하므로 빈 상태 안내는 중복 노이즈.
  if (!drafts || drafts.length === 0) {
    return null;
  }

  return (
    <section>
      <h4 className="mb-2 text-sm font-semibold">외부에서 가져온 일정 ({drafts.length})</h4>
      <p className="mb-3 text-xs text-muted-foreground">
        {canEdit
          ? "초안 클릭 → 카테고리·예약 상태·시간대를 채우면 정식 일정으로 승격됩니다."
          : "주인·호스트가 정식 일정으로 승격하기 전 단계의 초안입니다."}
      </p>
      <ul className="space-y-2">
        {drafts.map((d) => (
          <li
            key={d.id}
            className="flex items-start justify-between gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2"
          >
            <button
              className="flex-1 text-left disabled:cursor-not-allowed"
              onClick={() => openPromote(d)}
              disabled={!canEdit}
            >
              <div className="text-sm font-medium opacity-80">{d.title}</div>
              <div className="text-xs text-muted-foreground">
                {formatRange(d.startTime, d.endTime, d.isAllDay)}
                {d.locationText ? ` · ${d.locationText}` : ""}
              </div>
              <div className="mt-1 inline-flex items-center rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                외부 캘린더에서 가져옴
              </div>
            </button>
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <span className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent" aria-label="더보기">
                    <MoreHorizontal className="size-4" />
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleRefreshDraft(d)}>
                    다시 가져오기
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(d)} className="text-destructive">
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </li>
        ))}
      </ul>

      {/* inline 승격 폼 — 같은 다이얼로그 내부에서 펼침 */}
      {promoteTarget && canEdit && (
        <div className="mt-4 rounded-md border bg-card p-3">
          <div className="mb-2 text-sm font-semibold">정식 일정으로 만들기</div>
          <div className="mb-1 text-xs text-muted-foreground">{promoteTarget.title}</div>
          <div className="space-y-3 text-sm">
            <label className="block">
              <span className="mb-1 block text-xs font-medium">카테고리</span>
              <Select value={category} onValueChange={(v) => v && setCategory(v as ActivityCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium">예약 상태</span>
              <Select
                value={reservationStatus}
                onValueChange={(v) => v && setReservationStatus(v as ReservationStatus)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESERVATION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium">시작 시간대</span>
                <Select value={startTz} onValueChange={(v) => v && setStartTz(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium">종료 시간대</span>
                <Select value={endTz} onValueChange={(v) => v && setEndTz(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPromoteTarget(null)}
              disabled={submitting}
            >
              취소
            </Button>
            <Button size="sm" onClick={handlePromote} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  승격 중…
                </>
              ) : (
                "승격"
              )}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
