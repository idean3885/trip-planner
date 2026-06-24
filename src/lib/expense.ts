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

/** spec 062 — 일자 정보를 가진 비용 항목(원화 환산용). */
export interface DatedCostItem extends CostItem {
  /** 항목이 속한 여행 일자 "YYYY-MM-DD" (근사 환율 조회 키). */
  dateYmd: string;
}

/** 근사 환율 맵: rates[ymd][통화] = 현지 1단위당 원화. */
export type RateMap = Record<string, Record<string, number>>;

export interface KrwConversion {
  /** 원화 근사 합(반올림). */
  krw: number;
  /** 환율 미확보로 한화 합에서 빠진 비-KRW 금액이 있는가(부분 반영). */
  partial: boolean;
  /** 한화 합에 기여한 금액이 하나라도 있는가. */
  anyConverted: boolean;
}

/**
 * spec 062 — 항목들을 원화 근사로 환산해 합한다(참고용).
 * - KRW 항목은 환율 없이 그대로 가산.
 * - 비-KRW 항목은 (그 일자, 통화) 근사 환율로 환산. 환율 미확보면 합에서 제외하고
 *   partial=true (임의 추정 금지).
 * - 0/미입력은 기여 없음.
 */
export function convertToKrw(
  items: DatedCostItem[],
  rates: RateMap,
): KrwConversion {
  let krw = 0;
  let partial = false;
  let anyConverted = false;
  for (const it of items) {
    const amount = toAmount(it.cost);
    if (amount === 0) continue;
    const currency = (it.currency || "EUR").toUpperCase();
    if (currency === "KRW") {
      krw += amount;
      anyConverted = true;
      continue;
    }
    const rate = rates[it.dateYmd]?.[currency];
    if (rate === undefined) {
      partial = true;
      continue;
    }
    krw += amount * rate;
    anyConverted = true;
  }
  return { krw: Math.round(krw), partial, anyConverted };
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
