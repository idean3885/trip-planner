import type { PaymentTiming } from "@prisma/client";

/**
 * spec 061 (#807) — 지출 중심 일정 헬퍼.
 * 여행중 판정 + 사전/현장 디폴트 + 금액 합산(통화별, 사전/현장 소계).
 */

function ymdUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export interface TripPeriod {
  startDate?: string | Date | null;
  endDate?: string | Date | null;
}

/** 오늘(now)이 여행 기간(startDate~endDate, 일자 포함) 안인가. 기간 미설정이면 false. */
export function isTripInProgress(
  trip: TripPeriod | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!trip?.startDate || !trip?.endDate) return false;
  const today = ymdUTC(now);
  const start = ymdUTC(new Date(trip.startDate));
  const end = ymdUTC(new Date(trip.endDate));
  return start <= today && today <= end;
}

/**
 * 추가 폼의 지출시점 디폴트.
 * 여행 중(오늘∈여행기간) → 현장(ON_SITE), 그 외(여행 전·기간 미설정) → 사전(ADVANCE).
 */
export function resolveTimingDefault(
  trip: TripPeriod | null | undefined,
  now: Date = new Date(),
): PaymentTiming {
  return isTripInProgress(trip, now) ? "ON_SITE" : "ADVANCE";
}

export interface CostItem {
  cost?: number | string | null;
  currency?: string | null;
  paymentTiming?: PaymentTiming | null;
}

export interface CurrencySummary {
  currency: string;
  total: number;
  advance: number; // 사전 소계
  onSite: number; // 현장 소계
}

function toAmount(cost: number | string | null | undefined): number {
  if (cost === null || cost === undefined || cost === "") return 0;
  const n = typeof cost === "number" ? cost : Number(cost);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 활동들의 금액을 통화별로 합산. total + 사전/현장 소계.
 * 통화 혼재 시 통화별 라인(임의 환산 없음). cost 없으면 0 기여.
 */
export function summarize(items: CostItem[]): CurrencySummary[] {
  const byCurrency = new Map<string, CurrencySummary>();
  for (const it of items) {
    const amount = toAmount(it.cost);
    if (amount === 0) continue; // 0/미입력은 합계에 영향 없음
    const currency = (it.currency || "EUR").toUpperCase();
    let row = byCurrency.get(currency);
    if (!row) {
      row = { currency, total: 0, advance: 0, onSite: 0 };
      byCurrency.set(currency, row);
    }
    row.total += amount;
    if (it.paymentTiming === "ADVANCE") row.advance += amount;
    else row.onSite += amount; // ON_SITE 또는 미지정은 현장으로 집계
  }
  // 통화 알파벳 순 안정 정렬
  return [...byCurrency.values()].sort((a, b) =>
    a.currency.localeCompare(b.currency),
  );
}
