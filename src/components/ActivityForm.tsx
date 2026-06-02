"use client";

import type { ActivityCategory, ReservationStatus } from "@prisma/client";
import { useEffect, useState } from "react";

import { Linkify } from "@/components/Linkify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CATEGORY_OPTIONS: { value: ActivityCategory; label: string }[] = [
  { value: "SIGHTSEEING", label: "관광" },
  { value: "DINING", label: "식사" },
  { value: "TRANSPORT", label: "이동" },
  { value: "ACCOMMODATION", label: "숙소" },
  { value: "SHOPPING", label: "쇼핑" },
  { value: "OTHER", label: "기타" },
];

const RESERVATION_OPTIONS: { value: ReservationStatus | ""; label: string }[] =
  [
    { value: "", label: "선택 안함" },
    { value: "REQUIRED", label: "사전 예약 필수" },
    { value: "RECOMMENDED", label: "사전 예약 권장" },
    { value: "ON_SITE", label: "현장 구매" },
    { value: "NOT_NEEDED", label: "불필요" },
    { value: "RESERVED", label: "예약 완료" },
  ];

// shadcn Input(src/components/ui/input.tsx)의 핵심 클래스와 동기화.
// rounded/bg/padding/font/ring 스케일 일치. native <select>는 Base UI Select 교체 시 테스트 호환 이슈로 유지.
const SELECT_CLASS =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm";

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
  /** 편집·생성 모드 제출 핸들러. readOnly 상세에서는 불필요. */
  onSubmit?: (data: ActivityFormData) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
  /** spec 048 — 읽기 전용 상세 모드. 입력 비활성 + "편집"/"닫기" 푸터. */
  readOnly?: boolean;
  /** readOnly 상세에서 편집 모드로 전환. */
  onEdit?: () => void;
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
  readOnly = false,
  onEdit,
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
      Seoul: "서울",
      Tokyo: "도쿄",
      Lisbon: "리스본",
      Madrid: "마드리드",
      Paris: "파리",
      London: "런던",
      "New York": "뉴욕",
      "Los Angeles": "LA",
      Barcelona: "바르셀로나",
      Rome: "로마",
      Berlin: "베를린",
      Bangkok: "방콕",
      Singapore: "싱가포르",
      Shanghai: "상하이",
      Sydney: "시드니",
    };
    setTzLabel(CITY_KO[city] ?? city);

    if (!isEdit && !readOnly && !initial?.startTime && !form.startTime) {
      const { start, end } = getLocalTimes();
      setForm((prev) => ({ ...prev, startTime: start, endTime: end }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function update<K extends keyof ActivityFormData>(
    field: K,
    value: ActivityFormData[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly || !onSubmit || !form.title.trim()) return;
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
      className="border-border bg-muted/30 space-y-3 rounded-lg border p-4 lg:mx-auto lg:max-w-2xl"
    >
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <Label
            htmlFor="activity-category"
            className="text-muted-foreground text-[11px]"
          >
            유형 <span className="text-destructive">*</span>
          </Label>
          <select
            id="activity-category"
            value={form.category}
            onChange={(e) =>
              update("category", e.target.value as ActivityCategory)
            }
            disabled={readOnly}
            className={SELECT_CLASS}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 space-y-1">
          <Label
            htmlFor="activity-title"
            className="text-muted-foreground text-[11px]"
          >
            제목 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="activity-title"
            type="text"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            required
            readOnly={readOnly}
            className="h-8"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label
            htmlFor="activity-start"
            className="text-muted-foreground text-[11px]"
          >
            시작 <span className="text-destructive">*</span>
            {tzLabel && (
              <span className="text-muted-foreground/60 ml-1">({tzLabel})</span>
            )}
          </Label>
          <Input
            id="activity-start"
            type="time"
            value={form.startTime}
            onChange={(e) => update("startTime", e.target.value)}
            required
            readOnly={readOnly}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label
            htmlFor="activity-end"
            className="text-muted-foreground text-[11px]"
          >
            종료 <span className="text-destructive">*</span>
            {tzLabel && (
              <span className="text-muted-foreground/60 ml-1">({tzLabel})</span>
            )}
          </Label>
          <Input
            id="activity-end"
            type="time"
            value={form.endTime}
            onChange={(e) => update("endTime", e.target.value)}
            required
            readOnly={readOnly}
            className="h-8"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label
          htmlFor="activity-location"
          className="text-muted-foreground text-[11px]"
        >
          장소
        </Label>
        <Input
          id="activity-location"
          type="text"
          placeholder="예: 사그라다 파밀리아"
          value={form.location}
          onChange={(e) => update("location", e.target.value)}
          readOnly={readOnly}
          className="h-8"
        />
        <p className="text-muted-foreground/60 text-[11px]">
          지도·캘린더 위치로 연동됩니다. 자유 메모는 아래 메모란에 적어주세요.
        </p>
      </div>

      {/* spec 048 US2 — 핵심 정보(비용·통화·예약)를 메모 위로 모은다. */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label
            htmlFor="activity-cost"
            className="text-muted-foreground text-[11px]"
          >
            비용
          </Label>
          <Input
            id="activity-cost"
            type="number"
            step="0.01"
            min="0"
            placeholder="0"
            value={form.cost}
            onChange={(e) => update("cost", e.target.value)}
            readOnly={readOnly}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label
            htmlFor="activity-currency"
            className="text-muted-foreground text-[11px]"
          >
            통화
          </Label>
          <Input
            id="activity-currency"
            type="text"
            maxLength={3}
            value={form.currency}
            onChange={(e) => update("currency", e.target.value.toUpperCase())}
            readOnly={readOnly}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label
            htmlFor="activity-reservation"
            className="text-muted-foreground text-[11px]"
          >
            예약
          </Label>
          <select
            id="activity-reservation"
            value={form.reservationStatus}
            onChange={(e) => update("reservationStatus", e.target.value)}
            disabled={readOnly}
            className={SELECT_CLASS}
          >
            {RESERVATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <Label
          htmlFor="activity-memo"
          className="text-muted-foreground text-[11px]"
        >
          메모
        </Label>
        {readOnly ? (
          // spec 048 US2/US3 — 상세에서 메모는 최소 높이를 확보하고 링크를 인식한다.
          <div className="border-input min-h-24 w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-sm break-words whitespace-pre-wrap">
            {form.memo ? (
              <Linkify text={form.memo} />
            ) : (
              <span className="text-muted-foreground">메모 없음</span>
            )}
          </div>
        ) : (
          <textarea
            id="activity-memo"
            placeholder="메모"
            value={form.memo}
            onChange={(e) => update("memo", e.target.value)}
            rows={4}
            className="border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-24 w-full min-w-0 resize-y rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:ring-3 md:text-sm"
          />
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        {readOnly ? (
          <>
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              닫기
            </Button>
            {onEdit && (
              <Button type="button" size="sm" onClick={onEdit}>
                편집
              </Button>
            )}
          </>
        ) : (
          <>
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              취소
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving || !form.title.trim()}
            >
              {saving ? "저장 중..." : isEdit ? "수정" : "추가"}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
