import type { ActivityCategory, ReservationStatus, Prisma } from "@prisma/client";

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
            className="text-primary-600 underline hover:text-primary-800"
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
  OTHER: "bg-surface-100 text-surface-600",
};

/** IANA timezone → 약어 (e.g. "Asia/Seoul" → "KST") */
function tzAbbr(iana: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en", { timeZone: iana, timeZoneName: "short" })
      .formatToParts(new Date("2026-06-07T12:00:00Z"));
    return parts.find((p) => p.type === "timeZoneName")?.value ?? iana;
  } catch { return iana; }
}

/** ISO datetime → "HH:mm" 또는 "HH:mm TZ" */
function formatTime(value: string | null, tz?: string | null): string | null {
  if (!value) return null;
  if (value.includes("T")) {
    const d = new Date(value);
    const hhmm = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
    return tz ? `${hhmm} ${tzAbbr(tz)}` : hhmm;
  }
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
    <div className="group rounded-card border border-surface-200 p-3 transition-shadow hover:shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${CATEGORY_COLOR[activity.category]}`}
            >
              {CATEGORY_LABEL[activity.category]}
            </span>
            {timeRange && (
              <span className="text-body-sm text-surface-500">{timeRange}</span>
            )}
          </div>
          <p className="mt-1 text-body-sm font-medium text-surface-900">
            {activity.title}
          </p>
          {activity.location && (
            <p className="mt-0.5 text-body-sm text-surface-500">
              {activity.location}
            </p>
          )}
          {activity.memo && (
            <p className="mt-1 text-body-sm text-surface-400">
              <Linkify text={activity.memo} />
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          {cost !== null && cost > 0 && (
            <span className="text-body-sm font-medium text-surface-700">
              {cost.toLocaleString()} {activity.currency}
            </span>
          )}
          {activity.reservationStatus && (
            <span className="text-[11px] text-surface-400">
              {RESERVATION_LABEL[activity.reservationStatus]}
            </span>
          )}
        </div>
      </div>

      {canEdit && (
        <div className="mt-2 flex items-center justify-between border-t border-surface-100 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex gap-1">
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="rounded px-1.5 py-0.5 text-[11px] text-surface-400 hover:bg-surface-100 hover:text-surface-600 disabled:opacity-30 disabled:cursor-default"
              aria-label="위로"
            >
              ▲
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="rounded px-1.5 py-0.5 text-[11px] text-surface-400 hover:bg-surface-100 hover:text-surface-600 disabled:opacity-30 disabled:cursor-default"
              aria-label="아래로"
            >
              ▼
            </button>
          </div>
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="rounded px-2 py-0.5 text-[11px] text-surface-400 hover:bg-surface-100 hover:text-surface-600"
            >
              편집
            </button>
            <button
              onClick={onDelete}
              className="rounded px-2 py-0.5 text-[11px] text-red-400 hover:bg-red-50 hover:text-red-600"
            >
              삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
