import type {
  ActivityCategory,
  Prisma,
  ReservationStatus,
} from "@prisma/client";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";

import { Linkify } from "@/components/Linkify";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { tzLabel } from "@/lib/tz-label";

const CATEGORY_LABEL: Record<ActivityCategory, string> = {
  SIGHTSEEING: "관광",
  DINING: "식사",
  TRANSPORT: "이동",
  ACCOMMODATION: "숙소",
  SHOPPING: "쇼핑",
  OTHER: "기타",
};

const CATEGORY_COLOR: Record<ActivityCategory, string> = {
  SIGHTSEEING: "bg-sky-100 text-sky-700",
  DINING: "bg-orange-100 text-orange-700",
  TRANSPORT: "bg-violet-100 text-violet-700",
  ACCOMMODATION: "bg-emerald-100 text-emerald-700",
  SHOPPING: "bg-pink-100 text-pink-700",
  OTHER: "bg-muted text-muted-foreground",
};

/**
 * ISO datetime → "HH:mm" 또는 "HH:mm TZ".
 *
 * DB의 start_time/end_time은 UTC(Timestamptz)이다(#232). IANA timezone이 주어지면
 * 해당 시간대의 벽시각으로 렌더하고, 없으면 UTC로 렌더한다. 약어는 DST를 반영해
 * 계산한다(#325, `tzLabel` 참조).
 */
function formatTime(value: string | null, tz?: string | null): string | null {
  if (!value) return null;
  if (value.includes("T")) {
    const d = new Date(value);
    const timeZone = tz || "UTC";
    const hhmm = new Intl.DateTimeFormat("ko-KR", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
    return tz ? `${hhmm} ${tzLabel(tz, d)}` : hhmm;
  }
  /* c8 ignore next -- defensive passthrough: 동일. DB는 ISO만 저장. */
  return value;
}

const RESERVATION_LABEL: Record<ReservationStatus, string> = {
  REQUIRED: "사전 예약 필수",
  RECOMMENDED: "사전 예약 권장",
  ON_SITE: "현장 구매",
  NOT_NEEDED: "예약 불필요",
  RESERVED: "예약 완료",
};

interface ActivityCardProps {
  activity: {
    id: number;
    category: ActivityCategory;
    title: string;
    startTime: string | null;
    startTimezone?: string | null;
    endTime: string | null;
    endTimezone?: string | null;
    location: string | null;
    memo: string | null;
    url?: string | null;
    cost: Prisma.Decimal | string | number | null;
    currency: string;
    reservationStatus: ReservationStatus | null;
    allDay?: boolean;
  };
  canEdit?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  /** spec 048 — 본문 탭 시 상세(읽기 전용) 펼침. */
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function ActivityCard({
  activity,
  canEdit = false,
  isFirst = false,
  isLast = false,
  onView,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: ActivityCardProps) {
  const startFmt = formatTime(activity.startTime, activity.startTimezone);
  const endFmt = formatTime(activity.endTime, activity.endTimezone);
  // #740 — 종일 활동은 시각 대신 "종일" 표기.
  const timeRange = activity.allDay
    ? "종일"
    : startFmt && endFmt
      ? `${startFmt}–${endFmt}`
      : (startFmt ?? null);

  const cost = activity.cost ? Number(activity.cost) : null;

  // spec 048 — 본문 탭은 상세(읽기 전용)를 연다. 편집은 푸터의 "편집" 버튼으로만.
  const viewable = Boolean(onView);

  return (
    <Card size="sm" className="group gap-2">
      <CardContent
        className={`flex items-start justify-between gap-2${viewable ? "cursor-pointer" : ""}`}
        role={viewable ? "button" : undefined}
        tabIndex={viewable ? 0 : undefined}
        aria-label={viewable ? `${activity.title} 상세` : undefined}
        onClick={viewable ? onView : undefined}
        onKeyDown={
          viewable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onView?.();
                }
              }
            : undefined
        }
      >
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <span
              className={`inline-block shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${CATEGORY_COLOR[activity.category]}`}
            >
              {CATEGORY_LABEL[activity.category]}
            </span>
            {timeRange && (
              <span className="text-muted-foreground text-xs tabular-nums">
                {timeRange}
              </span>
            )}
          </div>
          <p className="text-foreground mt-1 text-sm font-medium break-words">
            {activity.title}
          </p>
          {activity.location && (
            <p className="text-muted-foreground mt-0.5 text-xs break-words">
              {activity.location}
            </p>
          )}
          {activity.memo && (
            // spec 058 — 목록 카드에서는 메모를 최대 3줄로 줄인다(말줄임표). 전문은
            // 카드 탭 → 상세(읽기 전용)에서 본다.
            <p className="text-muted-foreground mt-1 line-clamp-3 text-xs break-words">
              <Linkify text={activity.memo} />
            </p>
          )}
          {activity.url && (
            // spec 058 — 예약·티켓·문서 링크는 메모와 분리된 항목. 있을 때만 노출.
            <a
              href={activity.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-primary mt-1 block text-xs break-all underline underline-offset-2"
            >
              {activity.url}
            </a>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          {cost !== null && cost > 0 && (
            <span className="text-foreground text-sm font-medium tabular-nums">
              {cost.toLocaleString()} {activity.currency}
            </span>
          )}
          {activity.reservationStatus && (
            <span className="text-muted-foreground text-[11px]">
              {RESERVATION_LABEL[activity.reservationStatus]}
            </span>
          )}
        </div>
      </CardContent>

      {canEdit && (
        <CardFooter className="flex items-center justify-between opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100">
          <div className="flex gap-1">
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-6 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-30"
              aria-label="위로"
            >
              <ArrowUp className="size-3.5" aria-hidden />
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-6 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-30"
              aria-label="아래로"
            >
              <ArrowDown className="size-3.5" aria-hidden />
            </button>
          </div>
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs transition-colors"
            >
              <Pencil className="size-3" aria-hidden />
              편집
            </button>
            <button
              onClick={onDelete}
              className="text-destructive hover:bg-destructive/10 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs transition-colors"
            >
              <Trash2 className="size-3" aria-hidden />
              삭제
            </button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
