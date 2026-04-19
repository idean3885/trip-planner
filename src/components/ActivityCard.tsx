import type { ActivityCategory, ReservationStatus, Prisma } from "@prisma/client";
import { ArrowUp, ArrowDown, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

const URL_RE = /(https?:\/\/[^\s]+)/;

function Linkify({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        URL_RE.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-2 hover:opacity-80"
          >
            {part}
          </a>
        ) : (
          part
        )
      )}
    </>
  );
}

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

/** IANA timezone → 약어 (e.g. "Asia/Seoul" → "KST") */
function tzAbbr(iana: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en", { timeZone: iana, timeZoneName: "short" })
      .formatToParts(new Date("2026-06-07T12:00:00Z"));
    return parts.find((p) => p.type === "timeZoneName")?.value ?? iana;
  } catch {
    /* c8 ignore next -- defensive: ICU 구현체 따라 Intl이 throw할 수 있으나
       런타임 도달 조건 특정 어려움. 안전 폴백. */
    return iana;
  }
}

/**
 * ISO datetime → "HH:mm" 또는 "HH:mm TZ".
 *
 * DB의 start_time/end_time은 UTC(Timestamptz)이다(#232). IANA timezone이 주어지면
 * 해당 시간대의 벽시각으로 렌더하고, 없으면 UTC로 렌더한다.
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
    return tz ? `${hhmm} ${tzAbbr(tz)}` : hhmm;
  }
  /* c8 ignore next -- defensive passthrough: 동일. DB는 ISO만 저장. */
  return value;
}

const RESERVATION_LABEL: Record<ReservationStatus, string> = {
  REQUIRED: "사전 예약 필수",
  RECOMMENDED: "사전 예약 권장",
  ON_SITE: "현장 구매",
  NOT_NEEDED: "예약 불필요",
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
    cost: Prisma.Decimal | string | number | null;
    currency: string;
    reservationStatus: ReservationStatus | null;
  };
  canEdit?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
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
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: ActivityCardProps) {
  const startFmt = formatTime(activity.startTime, activity.startTimezone);
  const endFmt = formatTime(activity.endTime, activity.endTimezone);
  const timeRange =
    startFmt && endFmt
      ? `${startFmt}–${endFmt}`
      : startFmt ?? null;

  const cost = activity.cost ? Number(activity.cost) : null;

  return (
    <Card size="sm" className="group gap-2">
      <CardContent className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${CATEGORY_COLOR[activity.category]}`}
            >
              {CATEGORY_LABEL[activity.category]}
            </span>
            {timeRange && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {timeRange}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-medium text-foreground">
            {activity.title}
          </p>
          {activity.location && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {activity.location}
            </p>
          )}
          {activity.memo && (
            <p className="mt-1 text-xs text-muted-foreground">
              <Linkify text={activity.memo} />
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          {cost !== null && cost > 0 && (
            <span className="text-sm font-medium text-foreground tabular-nums">
              {cost.toLocaleString()} {activity.currency}
            </span>
          )}
          {activity.reservationStatus && (
            <span className="text-[11px] text-muted-foreground">
              {RESERVATION_LABEL[activity.reservationStatus]}
            </span>
          )}
        </div>
      </CardContent>

      {canEdit && (
        <CardFooter className="flex items-center justify-between opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <div className="flex gap-1">
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              aria-label="위로"
            >
              <ArrowUp className="size-3.5" aria-hidden />
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
              aria-label="아래로"
            >
              <ArrowDown className="size-3.5" aria-hidden />
            </button>
          </div>
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Pencil className="size-3" aria-hidden />
              편집
            </button>
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-destructive transition-colors hover:bg-destructive/10"
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
