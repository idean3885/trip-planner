"use client";

/**
 * spec 028 섹션 3 → spec 033 — 외부에서 가져온 일정(draft) 선택·일괄 보정·일괄 확정.
 *
 * 가져온 draft 목록을 체크박스로 전체/부분 선택하고(진입 시 전체 선택), 상단 sticky
 * 헤더의 확정 버튼으로 선택분을 한 번에 정식 일정으로 승격한다. 헤더 바로 아래에 시간
 * 미정 일괄 시작·타임존 일괄을 둔다. 보정값은 클라이언트 상태로만 들고 있다가(가져온
 * 시점 미저장) 확정 시 promote-batch 로 전송한다.
 *
 * 헌법 VII(부동 시간): 표시 시각은 저장된 벽시계 값(`getUTC*`)을 그대로 노출한다.
 * 타임존 일괄은 라벨만 교체하고 시각 숫자를 바꾸지 않는다. 시간 미정 일괄 시작은 그
 * 날짜에 벽시계 시작 값을 부여한다.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { TIMEZONE_OPTIONS } from "@/lib/timezones";

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

interface ItemOverride {
  category: ActivityCategory;
  reservationStatus: ReservationStatus;
  startTimezone: string;
  endTimezone: string;
  /** 보정된 부동 시각(ISO). undefined 면 draft 원본 사용. */
  startTime?: string;
  endTime?: string;
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
  { value: "RESERVED", label: "예약 완료" },
];

const pad = (n: number) => String(n).padStart(2, "0");

/** 헌법 VII — 벽시계 값을 그대로 표시(관찰자 타임존 환산 없음). */
function formatHHMM(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
function formatMonthDay(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}`;
}

/** 같은 날짜에 벽시계 HH:MM 을 부여한 부동 시각 ISO 를 만든다. */
function withFloatingTime(baseIso: string, hhmm: string): string {
  const base = new Date(baseIso);
  const [h, m] = hhmm.split(":").map((v) => parseInt(v, 10));
  return new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), h, m),
  ).toISOString();
}
/** start 기준 +1시간 부동 시각. */
function plusOneHour(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() + 60 * 60 * 1000).toISOString();
}

function defaultOverride(d: DraftDTO): ItemOverride {
  return {
    category: "SIGHTSEEING",
    reservationStatus: "NOT_NEEDED",
    startTimezone: d.startTimezone ?? "Asia/Seoul",
    endTimezone: d.endTimezone ?? d.startTimezone ?? "Asia/Seoul",
  };
}

interface Props {
  tripId: number;
  canEdit: boolean;
  onMutated: () => void;
}

export default function DraftSection({ tripId, canEdit, onMutated }: Props) {
  const [drafts, setDrafts] = useState<DraftDTO[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [overrides, setOverrides] = useState<Record<number, ItemOverride>>({});
  const [batchStartTime, setBatchStartTime] = useState("09:00");
  const [batchTimezone, setBatchTimezone] = useState("Asia/Seoul");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/drafts?status=PENDING`, {
        cache: "no-store",
      });
      const list: DraftDTO[] = res.ok ? (await res.json()).drafts : [];
      setDrafts(list);
      // 진입 시 전체 선택 + 기본 override.
      setSelected(new Set(list.map((d) => d.id)));
      setOverrides(
        Object.fromEntries(list.map((d) => [d.id, defaultOverride(d)])),
      );
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const allSelected = useMemo(
    () => drafts !== null && drafts.length > 0 && selected.size === drafts.length,
    [drafts, selected],
  );

  const toggleAll = useCallback(() => {
    if (!drafts) return;
    setSelected((prev) =>
      prev.size === drafts.length ? new Set() : new Set(drafts.map((d) => d.id)),
    );
  }, [drafts]);

  const toggleOne = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const updateOverride = useCallback(
    (id: number, partial: Partial<ItemOverride>) => {
      setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...partial } }));
    },
    [],
  );

  // 시간 미정(종일) draft 에만 일괄 시작 시각 부여. 시간 있는 draft 불변.
  const applyBatchStartTime = useCallback(() => {
    if (!drafts) return;
    setOverrides((prev) => {
      const next = { ...prev };
      let count = 0;
      for (const d of drafts) {
        if (!d.isAllDay) continue;
        const start = withFloatingTime(d.startTime, batchStartTime);
        next[d.id] = { ...next[d.id], startTime: start, endTime: plusOneHour(start) };
        count++;
      }
      toast.success(`시간 미정 ${count}건에 시작 시간을 적용했습니다.`);
      return next;
    });
  }, [drafts, batchStartTime]);

  // 시간 있는 draft 의 타임존 라벨만 일괄 교체(시각 숫자 유지, 헌법 VII).
  const applyBatchTimezone = useCallback(() => {
    if (!drafts) return;
    setOverrides((prev) => {
      const next = { ...prev };
      let count = 0;
      for (const d of drafts) {
        if (d.isAllDay) continue;
        next[d.id] = {
          ...next[d.id],
          startTimezone: batchTimezone,
          endTimezone: batchTimezone,
        };
        count++;
      }
      toast.success(`시간 있는 ${count}건의 타임존을 ${batchTimezone}로 맞췄습니다.`);
      return next;
    });
  }, [drafts, batchTimezone]);

  const handleConfirm = useCallback(async () => {
    if (!drafts) return;
    const items = drafts
      .filter((d) => selected.has(d.id))
      .map((d) => {
        const ov = overrides[d.id] ?? defaultOverride(d);
        return {
          draftId: d.id,
          category: ov.category,
          reservationStatus: ov.reservationStatus,
          startTimezone: ov.startTimezone,
          endTimezone: ov.endTimezone,
          startTime: ov.startTime,
          endTime: ov.endTime,
        };
      });
    if (items.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/drafts/promote-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        toast.error("가져오기 실패", { description: `오류 코드 ${res.status}` });
        return;
      }
      const data = (await res.json()) as {
        promoted: { draftId: number }[];
        failed: { draftId: number | null }[];
      };
      if (data.promoted.length > 0) {
        toast.success(`${data.promoted.length}건을 일정으로 가져왔습니다.`);
      }
      if (data.failed.length > 0) {
        toast.error(`${data.failed.length}건은 가져오지 못했습니다.`);
      }
      await refresh();
      onMutated();
    } finally {
      setSubmitting(false);
    }
  }, [drafts, selected, overrides, tripId, refresh, onMutated]);

  if (loading && drafts === null) return null;
  if (!drafts || drafts.length === 0) return null;

  return (
    <section className="min-w-0">
      {/* 상단 sticky — 확정 버튼 + 일괄 설정. 목록만 스크롤된다. */}
      <div className="sticky top-0 z-10 -mx-1 mb-3 space-y-2 bg-background px-1 pb-2 pt-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">외부에서 가져온 일정 ({drafts.length})</h4>
          {canEdit && (
            <Button size="sm" onClick={handleConfirm} disabled={submitting || selected.size === 0}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  가져오는 중…
                </>
              ) : (
                `${selected.size}건 가져오기`
              )}
            </Button>
          )}
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              전체 선택 ({selected.size}/{drafts.length})
            </label>
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground">시간 미정 일괄</span>
              <input
                type="time"
                value={batchStartTime}
                onChange={(e) => setBatchStartTime(e.target.value)}
                className="rounded border border-border bg-background px-1.5 py-0.5 tabular-nums"
              />
              <Button variant="outline" size="sm" className="h-7 px-2" onClick={applyBatchStartTime}>
                적용
              </Button>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground">타임존 일괄</span>
              <select
                value={batchTimezone}
                onChange={(e) => setBatchTimezone(e.target.value)}
                className="rounded border border-border bg-background px-1.5 py-0.5"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
              <Button variant="outline" size="sm" className="h-7 px-2" onClick={applyBatchTimezone}>
                적용
              </Button>
            </span>
          </div>
        )}
      </div>

      <ul className="space-y-2">
        {drafts.map((d) => {
          const ov = overrides[d.id] ?? defaultOverride(d);
          const effStart = ov.startTime ?? d.startTime;
          const timeLabel = d.isAllDay && !ov.startTime
            ? "종일"
            : `${formatHHMM(effStart)} · ${ov.startTimezone}`;
          return (
            <li
              key={d.id}
              className="rounded-md border border-dashed bg-muted/30 px-3 py-2"
            >
              {/* 모바일 가로 스크롤 방지 — flex-wrap + min-w-0 + break-words */}
              <div className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1">
                {canEdit && (
                  <input
                    type="checkbox"
                    checked={selected.has(d.id)}
                    onChange={() => toggleOne(d.id)}
                    className="mt-1 shrink-0"
                    aria-label={`${d.title} 선택`}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="break-words text-sm font-medium">{d.title}</div>
                  <div className="break-words text-xs text-muted-foreground">
                    {formatMonthDay(effStart)} {timeLabel}
                    {d.locationText ? ` · ${d.locationText}` : ""}
                  </div>
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 px-2 text-xs"
                    onClick={() => setEditingId(editingId === d.id ? null : d.id)}
                  >
                    수정
                  </Button>
                )}
              </div>

              {/* 개별 수정 — 그 항목 override 만 덮어쓴다. */}
              {editingId === d.id && canEdit && (
                <div className="mt-2 grid grid-cols-1 gap-2 border-t pt-2 sm:grid-cols-2">
                  <label className="block text-xs">
                    <span className="mb-1 block font-medium">카테고리</span>
                    <Select value={ov.category} onValueChange={(v) => v && updateOverride(d.id, { category: v as ActivityCategory })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="block text-xs">
                    <span className="mb-1 block font-medium">예약 상태</span>
                    <Select value={ov.reservationStatus} onValueChange={(v) => v && updateOverride(d.id, { reservationStatus: v as ReservationStatus })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RESERVATION_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="block text-xs">
                    <span className="mb-1 block font-medium">타임존</span>
                    <select
                      value={ov.startTimezone}
                      onChange={(e) => updateOverride(d.id, { startTimezone: e.target.value, endTimezone: e.target.value })}
                      className="w-full rounded border border-border bg-background px-2 py-1"
                    >
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs">
                    <span className="mb-1 block font-medium">시작 시각</span>
                    <input
                      type="time"
                      value={formatHHMM(effStart)}
                      onChange={(e) => {
                        const start = withFloatingTime(effStart, e.target.value);
                        updateOverride(d.id, { startTime: start, endTime: plusOneHour(start) });
                      }}
                      className="w-full rounded border border-border bg-background px-2 py-1 tabular-nums"
                    />
                  </label>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
