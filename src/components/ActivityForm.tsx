"use client";

import type { ActivityCategory, PaymentTiming } from "@prisma/client";
import { useState } from "react";

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

// spec 061 — 지출 시점(사전/현장). 예약 "여부"를 대체하는 단순 2값.
const PAYMENT_OPTIONS: { value: PaymentTiming; label: string }[] = [
  { value: "ADVANCE", label: "사전 결제" },
  { value: "ON_SITE", label: "현장 결제" },
];
const PAYMENT_LABEL: Record<PaymentTiming, string> = {
  ADVANCE: "사전 결제",
  ON_SITE: "현장 결제",
};

const SELECT_CLASS =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm";

export interface ActivityFormData {
  category: ActivityCategory;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  memo: string;
  url: string;
  cost: string;
  currency: string;
  paymentTiming: PaymentTiming;
  allDay: boolean;
}

interface ActivityFormProps {
  initial?: Partial<ActivityFormData>;
  /** 편집·생성 모드 제출 핸들러. readOnly 상세에서는 불필요. */
  onSubmit?: (data: ActivityFormData) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
  /** spec 048 — 읽기 전용 상세 모드. 평문 보기 + "편집"/"닫기". */
  readOnly?: boolean;
  /** readOnly 상세에서 편집 모드로 전환. */
  onEdit?: () => void;
  /** spec 061 — 추가 시 지출시점 디폴트(여행중=현장 / 여행전=사전). */
  timingDefault?: PaymentTiming;
}

function ReadField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-muted-foreground text-[11px]">{label}</p>
      <div className="text-foreground text-sm break-words whitespace-pre-wrap">
        {children}
      </div>
    </div>
  );
}

export default function ActivityForm({
  initial,
  onSubmit,
  onCancel,
  isEdit = false,
  readOnly = false,
  onEdit,
  timingDefault = "ON_SITE",
}: ActivityFormProps) {
  const [form, setForm] = useState<ActivityFormData>({
    category: initial?.category ?? "SIGHTSEEING",
    title: initial?.title ?? "",
    startTime: initial?.startTime ?? "",
    endTime: initial?.endTime ?? "",
    location: initial?.location ?? "",
    memo: initial?.memo ?? "",
    url: initial?.url ?? "",
    cost: initial?.cost ?? "",
    currency: initial?.currency ?? "EUR",
    paymentTiming: initial?.paymentTiming ?? timingDefault,
    allDay: initial?.allDay ?? false,
  });
  const [saving, setSaving] = useState(false);
  // spec 061 — 모바일 간소화: 생성은 제목·가격·내용 3필드로 시작, 편집은 전체.
  // 편집(isEdit)은 key 재사용으로 readOnly→편집 전환 시에도 항상 전체를 보이게 파생.
  const [expanded, setExpanded] = useState(isEdit);
  const showAll = isEdit || expanded;

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

  // ── 읽기 전용 상세(보기) — spec 048/#796. 평문 값, 입력칸 없음. ──
  if (readOnly) {
    const muted = (t: string) => (
      <span className="text-muted-foreground">{t}</span>
    );
    const categoryLabel =
      CATEGORY_OPTIONS.find((o) => o.value === form.category)?.label ??
      form.category;
    const timeText = form.allDay
      ? "종일"
      : form.startTime || form.endTime
        ? `${form.startTime || "?"}–${form.endTime || "?"}`
        : null;
    return (
      <div className="border-border bg-muted/30 space-y-3 rounded-lg border p-4 lg:mx-auto lg:max-w-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-muted text-muted-foreground inline-block rounded-md px-1.5 py-0.5 text-[11px] font-semibold">
            {categoryLabel}
          </span>
          <p className="text-foreground text-base font-medium break-words">
            {form.title || muted("제목 없음")}
          </p>
        </div>
        <ReadField label="시간">{timeText ?? muted("시간 없음")}</ReadField>
        <ReadField label="장소">
          {form.location || muted("장소 없음")}
        </ReadField>
        <ReadField label="링크">
          {form.url ? (
            <a
              href={form.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              {form.url}
            </a>
          ) : (
            muted("링크 없음")
          )}
        </ReadField>
        <div className="grid grid-cols-2 gap-2">
          <ReadField label="비용">
            {form.cost ? `${form.cost} ${form.currency}` : muted("비용 없음")}
          </ReadField>
          <ReadField label="지출">{PAYMENT_LABEL[form.paymentTiming]}</ReadField>
        </div>
        <ReadField label="메모">
          {form.memo ? <Linkify text={form.memo} /> : muted("메모 없음")}
        </ReadField>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            닫기
          </Button>
          {onEdit && (
            <Button type="button" size="sm" onClick={onEdit}>
              편집
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── 편집/생성 폼 ──
  return (
    <form
      onSubmit={handleSubmit}
      className="border-border bg-muted/30 space-y-3 rounded-lg border p-4 lg:mx-auto lg:max-w-2xl"
    >
      {/* 제목 (항상) */}
      <div className="space-y-1">
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
          className="h-8"
        />
      </div>

      {/* 가격 (항상 — 간소 경로 핵심) */}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2 space-y-1">
          <Label
            htmlFor="activity-cost"
            className="text-muted-foreground text-[11px]"
          >
            가격
          </Label>
          <Input
            id="activity-cost"
            type="number"
            step="0.01"
            min="0"
            placeholder="0"
            value={form.cost}
            onChange={(e) => update("cost", e.target.value)}
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
            className="h-8"
          />
        </div>
      </div>

      {/* 내용(메모) (항상) */}
      <div className="space-y-1">
        <Label
          htmlFor="activity-memo"
          className="text-muted-foreground text-[11px]"
        >
          내용
        </Label>
        <textarea
          id="activity-memo"
          placeholder="내용 (선택)"
          value={form.memo}
          onChange={(e) => update("memo", e.target.value)}
          rows={3}
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-16 w-full min-w-0 resize-y rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:ring-3 md:text-sm"
        />
      </div>

      {!showAll && (
        // spec 061 — 간소 추가: 더 적을 게 있으면 확장.
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-muted-foreground hover:text-foreground w-full rounded-lg border border-dashed border-border py-1.5 text-xs transition-colors"
        >
          + 시간·장소·유형·지출시점 확장
        </button>
      )}

      {showAll && (
        <div className="space-y-3">
          {/* 유형 */}
          <div className="space-y-1">
            <Label
              htmlFor="activity-category"
              className="text-muted-foreground text-[11px]"
            >
              유형
            </Label>
            <select
              id="activity-category"
              value={form.category}
              onChange={(e) =>
                update("category", e.target.value as ActivityCategory)
              }
              className={SELECT_CLASS}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 지출 시점 (사전/현장) */}
          <div className="space-y-1">
            <Label
              htmlFor="activity-timing"
              className="text-muted-foreground text-[11px]"
            >
              지출 시점
            </Label>
            <select
              id="activity-timing"
              value={form.paymentTiming}
              onChange={(e) =>
                update("paymentTiming", e.target.value as PaymentTiming)
              }
              className={SELECT_CLASS}
            >
              {PAYMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 종일 + 시간(선택) */}
          <label className="text-muted-foreground flex items-center gap-2 text-[11px] select-none">
            <input
              type="checkbox"
              checked={form.allDay}
              onChange={(e) => {
                const checked = e.target.checked;
                setForm((prev) => ({
                  ...prev,
                  allDay: checked,
                  ...(checked && { startTime: "", endTime: "" }),
                }));
              }}
            />
            종일 (시간 없음)
          </label>

          {!form.allDay && (
            <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
              <div className="space-y-1">
                <Label
                  htmlFor="activity-start"
                  className="text-muted-foreground text-[11px]"
                >
                  시작 (선택)
                </Label>
                <Input
                  id="activity-start"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => update("startTime", e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="activity-end"
                  className="text-muted-foreground text-[11px]"
                >
                  종료 (선택)
                </Label>
                <Input
                  id="activity-end"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => update("endTime", e.target.value)}
                  className="h-8"
                />
              </div>
            </div>
          )}

          {/* 장소 */}
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
              className="h-8"
            />
          </div>

          {/* 링크 */}
          <div className="space-y-1">
            <Label
              htmlFor="activity-url"
              className="text-muted-foreground text-[11px]"
            >
              링크
            </Label>
            <Input
              id="activity-url"
              type="url"
              inputMode="url"
              placeholder="예: 예약 확인 페이지 링크"
              value={form.url}
              onChange={(e) => update("url", e.target.value)}
              className="h-8"
            />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" size="sm" disabled={saving || !form.title.trim()}>
          {saving ? "저장 중..." : isEdit ? "수정" : "추가"}
        </Button>
      </div>
    </form>
  );
}
