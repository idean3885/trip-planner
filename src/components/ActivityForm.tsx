"use client";

import { useState, useEffect } from "react";
import type { ActivityCategory, ReservationStatus } from "@prisma/client";

const CATEGORY_OPTIONS: { value: ActivityCategory; label: string }[] = [
  { value: "SIGHTSEEING", label: "관광" },
  { value: "DINING", label: "식사" },
  { value: "TRANSPORT", label: "이동" },
  { value: "ACCOMMODATION", label: "숙소" },
  { value: "SHOPPING", label: "쇼핑" },
  { value: "OTHER", label: "기타" },
];

const RESERVATION_OPTIONS: { value: ReservationStatus | ""; label: string }[] = [
  { value: "", label: "선택 안함" },
  { value: "REQUIRED", label: "사전 예약 필수" },
  { value: "RECOMMENDED", label: "사전 예약 권장" },
  { value: "ON_SITE", label: "현장 구매" },
  { value: "NOT_NEEDED", label: "불필요" },
];

export interface ActivityFormData {
  category: ActivityCategory;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  memo: string;
  cost: string;
  currency: string;
  reservationStatus: string;
}

interface ActivityFormProps {
  initial?: Partial<ActivityFormData>;
  onSubmit: (data: ActivityFormData) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
}

function getLocalTimes(): { start: string; end: string } {
  const now = new Date();
  const min = now.getMinutes();
  const startMin = min < 30 ? 30 : 0;
  if (startMin === 0) now.setHours(now.getHours() + 1);
  now.setMinutes(startMin);
  const start = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  now.setHours(now.getHours() + 1);
  const end = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return { start, end };
}

export default function ActivityForm({
  initial,
  onSubmit,
  onCancel,
  isEdit = false,
}: ActivityFormProps) {
  const [form, setForm] = useState<ActivityFormData>({
    category: initial?.category ?? "SIGHTSEEING",
    title: initial?.title ?? "",
    startTime: initial?.startTime ?? "",
    endTime: initial?.endTime ?? "",
    location: initial?.location ?? "",
    memo: initial?.memo ?? "",
    cost: initial?.cost ?? "",
    currency: initial?.currency ?? "EUR",
    reservationStatus: initial?.reservationStatus ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [tzLabel, setTzLabel] = useState("");

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
    const CITY_KO: Record<string, string> = {
      Seoul: "서울", Tokyo: "도쿄", Lisbon: "리스본", Madrid: "마드리드",
      Paris: "파리", London: "런던", "New York": "뉴욕", "Los Angeles": "LA",
      Barcelona: "바르셀로나", Rome: "로마", Berlin: "베를린", Bangkok: "방콕",
      Singapore: "싱가포르", Shanghai: "상하이", Sydney: "시드니",
    };
    setTzLabel(CITY_KO[city] ?? city);

    if (!isEdit && !initial?.startTime && !form.startTime) {
      const { start, end } = getLocalTimes();
      setForm((prev) => ({ ...prev, startTime: start, endTime: end }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function update(field: keyof ActivityFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-card border border-surface-200 bg-surface-50 p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <div>
          <label className="block text-[11px] text-surface-400 mb-0.5">
            유형 <span className="text-red-400">*</span>
          </label>
          <select
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            className="rounded-md border border-surface-200 bg-white px-2 py-1.5 text-body-sm"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-[11px] text-surface-400 mb-0.5">
            제목 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            required
            className="w-full rounded-md border border-surface-200 px-3 py-1.5 text-body-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] text-surface-400 mb-0.5">
            시작 <span className="text-red-400">*</span>
            {tzLabel && <span className="ml-1 text-surface-300">({tzLabel})</span>}
          </label>
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => update("startTime", e.target.value)}
            required
            className="w-full rounded-md border border-surface-200 px-2 py-1.5 text-body-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] text-surface-400 mb-0.5">
            종료 <span className="text-red-400">*</span>
            {tzLabel && <span className="ml-1 text-surface-300">({tzLabel})</span>}
          </label>
          <input
            type="time"
            value={form.endTime}
            onChange={(e) => update("endTime", e.target.value)}
            required
            className="w-full rounded-md border border-surface-200 px-2 py-1.5 text-body-sm"
          />
        </div>
      </div>

      <input
        type="text"
        placeholder="장소"
        value={form.location}
        onChange={(e) => update("location", e.target.value)}
        className="w-full rounded-md border border-surface-200 px-3 py-1.5 text-body-sm"
      />

      <textarea
        placeholder="메모"
        value={form.memo}
        onChange={(e) => update("memo", e.target.value)}
        rows={2}
        className="w-full rounded-md border border-surface-200 px-3 py-1.5 text-body-sm resize-none"
      />

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[11px] text-surface-400 mb-0.5">비용</label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0"
            value={form.cost}
            onChange={(e) => update("cost", e.target.value)}
            className="w-full rounded-md border border-surface-200 px-2 py-1.5 text-body-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] text-surface-400 mb-0.5">통화</label>
          <input
            type="text"
            maxLength={3}
            value={form.currency}
            onChange={(e) => update("currency", e.target.value.toUpperCase())}
            className="w-full rounded-md border border-surface-200 px-2 py-1.5 text-body-sm"
          />
        </div>
        <div>
          <label className="block text-[11px] text-surface-400 mb-0.5">예약</label>
          <select
            value={form.reservationStatus}
            onChange={(e) => update("reservationStatus", e.target.value)}
            className="w-full rounded-md border border-surface-200 bg-white px-2 py-1.5 text-body-sm"
          >
            {RESERVATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-body-sm text-surface-500 hover:bg-surface-100"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={saving || !form.title.trim()}
          className="rounded-md bg-surface-900 px-3 py-1.5 text-body-sm text-white hover:bg-surface-700 disabled:opacity-50"
        >
          {saving ? "저장 중..." : isEdit ? "수정" : "추가"}
        </button>
      </div>
    </form>
  );
}
