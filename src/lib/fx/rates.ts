/**
 * spec 062 — 원화 자동 근사 환산 시세 확보.
 *
 * 여행자 입력 없이 일자·통화별 "현지 1단위 = 원화 N" 근사 시세를 확보한다.
 * 캐시(exchange_rates) 우선 → 미스 시 무료·무인증 공개 일별 시세(ECB 기반
 * Frankfurter)를 1회 호출 → upsert. 실패하면 null(현화-only로 graceful).
 *
 * 참고용 근사치다. 정산 정확값이 아니며, 현화 원본 금액이 정본이다.
 */

import { prisma } from "@/lib/prisma";

/** 고정 기준 통화. 스스로 1이므로 시세 확보 불필요. */
export const BASE_CURRENCY = "KRW";

/** "YYYY-MM-DD" 로 정규화 (Date | string 입력 허용). */
function toYmd(date: string | Date): string {
  if (typeof date === "string") return date.slice(0, 10);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

/**
 * (통화, 일자)의 원화 근사 환율. KRW=1. 캐시 우선, 미스만 외부 1회 호출 후 캐시.
 * 확보 실패 시 null — 호출부는 그 통화의 한화 병기를 생략한다(추정 금지).
 */
export async function getApproxRate(
  base: string,
  date: string | Date,
): Promise<number | null> {
  const cur = base.toUpperCase();
  if (cur === BASE_CURRENCY) return 1;
  const ymd = toYmd(date);
  const dateObj = new Date(`${ymd}T00:00:00.000Z`);

  const cached = await prisma.exchangeRate.findUnique({
    where: { date_base: { date: dateObj, base: cur } },
  });
  if (cached) return Number(cached.rateToKrw);

  const rate = await fetchRate(cur, ymd);
  if (rate === null) return null;

  // upsert — 동시 조회 경합 시 unique 충돌을 무시하고 기존 값을 보존.
  await prisma.exchangeRate
    .upsert({
      where: { date_base: { date: dateObj, base: cur } },
      create: { date: dateObj, base: cur, rateToKrw: rate },
      update: {},
    })
    .catch(() => {});
  return rate;
}

/** (통화, 일자) 쌍의 근사 환율 맵: map[ymd][CUR] = rate. 확보 실패분은 누락. */
export async function getRatesForPairs(
  pairs: { base: string; date: string | Date }[],
): Promise<Record<string, Record<string, number>>> {
  // (ymd, base) 중복 제거 — 같은 쌍은 한 번만 확보.
  const seen = new Map<string, { base: string; ymd: string }>();
  for (const p of pairs) {
    const base = p.base.toUpperCase();
    if (base === BASE_CURRENCY) continue;
    const ymd = toYmd(p.date);
    seen.set(`${ymd}|${base}`, { base, ymd });
  }

  const map: Record<string, Record<string, number>> = {};
  await Promise.all(
    [...seen.values()].map(async ({ base, ymd }) => {
      const rate = await getApproxRate(base, ymd);
      if (rate === null) return;
      (map[ymd] ??= {})[base] = rate;
    }),
  );
  return map;
}
