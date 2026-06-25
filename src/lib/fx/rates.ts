/**
 * spec 062 — 원화 자동 근사 환산 시세 확보.
 *
 * 여행자 입력 없이 일자·통화별 "현지 1단위 = 원화 N" 근사 시세를 확보한다.
 * 캐시(exchange_rates) 우선 → 미스/잠정값만 무료·무인증 공개 일별 시세(ECB 기반
 * Frankfurter)를 호출 → upsert. 실패하면 직전 캐시(있으면) 또는 null.
 *
 * 당일(엣지) 처리: 환율은 그 날이 닫혀야 확정된다. 그래서 "그 일자보다 나중에
 * 확보(fetchedAt > date)"된 캐시만 최종값으로 신뢰하고, 같은 날 잡은 잠정값은
 * 접근 시마다 갱신해 결국 최종 환율로 굳힌다(#820 후속).
 *
 * 참고용 근사치다. 정산 정확값이 아니며, 현화 원본 금액이 정본이다.
 */

import type { ExchangeRate } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/** 고정 기준 통화. 스스로 1이므로 시세 확보 불필요. */
export const BASE_CURRENCY = "KRW";

/** "YYYY-MM-DD" 로 정규화 (Date | string 입력 허용, UTC 기준). */
function toYmd(date: string | Date): string {
  if (typeof date === "string") return date.slice(0, 10);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function ymdToDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

/**
 * 캐시 행이 "최종 확정"인가 — 그 일자가 닫힌 뒤(확보일 > 환율일) 잡은 값만 신뢰한다.
 * 같은 날 잡은 잠정값(당일 환율)은 최종이 아니라 갱신 대상이다.
 */
function isFinal(row: Pick<ExchangeRate, "date" | "fetchedAt">): boolean {
  return toYmd(row.fetchedAt) > toYmd(row.date);
}

/** 외부 일별 시세 호출. 실패·누락이면 null. 약 4초 타임아웃. */
async function fetchRate(base: string, ymd: string): Promise<number | null> {
  try {
    const url = `https://api.frankfurter.app/${ymd}?from=${base}&to=${BASE_CURRENCY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const body = (await res.json()) as { rates?: Record<string, number> };
    const rate = body.rates?.[BASE_CURRENCY];
    return typeof rate === "number" && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

/** 외부 시세를 확보해 캐시에 upsert(잠정→최종 갱신 포함). */
async function fetchAndStore(base: string, ymd: string): Promise<number | null> {
  const rate = await fetchRate(base, ymd);
  if (rate === null) return null;
  const date = ymdToDate(ymd);
  await prisma.exchangeRate
    .upsert({
      where: { date_base: { date, base } },
      create: { date, base, rateToKrw: rate },
      // 잠정값(당일)을 최신으로 갱신 — 그 날이 닫히면 최종값으로 굳는다.
      update: { rateToKrw: rate, fetchedAt: new Date() },
    })
    .catch(() => {});
  return rate;
}

/**
 * (통화, 일자)의 원화 근사 환율. KRW=1. 최종 확정 캐시는 그대로,
 * 잠정/미스는 외부 갱신 후 반환. 확보 실패 시 직전 캐시 또는 null.
 */
export async function getApproxRate(
  base: string,
  date: string | Date,
): Promise<number | null> {
  const cur = base.toUpperCase();
  if (cur === BASE_CURRENCY) return 1;
  const ymd = toYmd(date);

  const cached = await prisma.exchangeRate.findUnique({
    where: { date_base: { date: ymdToDate(ymd), base: cur } },
  });
  if (cached && isFinal(cached)) return Number(cached.rateToKrw);

  const fresh = await fetchAndStore(cur, ymd);
  if (fresh !== null) return fresh;
  // 외부 실패 — 잠정 캐시라도 있으면 그걸로(추정 아님, 직전 실측).
  return cached ? Number(cached.rateToKrw) : null;
}

/**
 * (통화, 일자) 쌍의 근사 환율 맵: map[ymd][CUR] = rate.
 * 캐시는 단일 조회로 일괄로 읽고(미스·잠정만 외부 호출) 매 로드 N쿼리를 1쿼리로 줄인다.
 * 확보 실패분은 맵에서 누락 → 호출부가 그 통화 병기를 생략한다.
 */
export async function getRatesForPairs(
  pairs: { base: string; date: string | Date }[],
): Promise<Record<string, Record<string, number>>> {
  const seen = new Map<string, { base: string; ymd: string }>();
  for (const p of pairs) {
    const base = p.base.toUpperCase();
    if (base === BASE_CURRENCY) continue;
    const ymd = toYmd(p.date);
    seen.set(`${ymd}|${base}`, { base, ymd });
  }
  const distinct = [...seen.values()];
  const map: Record<string, Record<string, number>> = {};
  if (distinct.length === 0) return map;

  // 1쿼리 — 필요한 (일자,통화)를 한 번에 읽는다.
  const rows = await prisma.exchangeRate.findMany({
    where: {
      OR: distinct.map((d) => ({ date: ymdToDate(d.ymd), base: d.base })),
    },
  });
  const byKey = new Map<string, ExchangeRate>();
  for (const r of rows) byKey.set(`${toYmd(r.date)}|${r.base}`, r);

  const put = (ymd: string, base: string, rate: number) => {
    (map[ymd] ??= {})[base] = rate;
  };

  await Promise.all(
    distinct.map(async ({ base, ymd }) => {
      const cached = byKey.get(`${ymd}|${base}`);
      if (cached && isFinal(cached)) {
        put(ymd, base, Number(cached.rateToKrw));
        return;
      }
      const fresh = await fetchAndStore(base, ymd);
      if (fresh !== null) put(ymd, base, fresh);
      else if (cached) put(ymd, base, Number(cached.rateToKrw));
    }),
  );
  return map;
}
