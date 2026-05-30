/**
 * #669 — 일정 윈도우 로딩 계산(순수 함수).
 *
 * 여행 상세는 모든 날짜의 일정을 한 번에 받지 않고, 선택일 기준 앞뒤 N일만
 * 받아 캐시에 둔다. 이동하면 새로 들어온 날짜의 일정을 백그라운드로 받는다.
 * 날짜 인덱스(어느 날 Day 가 있는지)는 진입 시 전체를 받으므로 캘린더 점·기간
 * 표시는 그대로다.
 */

/** 선택일 기준 앞뒤 N일을 미리 받는다. */
export const ACTIVITY_WINDOW_RADIUS = 3;

/** Date → 로컬 기준 YYYY-MM-DD (floating-time 관행 #232, 기존 toYmd 와 동일). */
export function ymdLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** center 기준 [-radius, +radius] 일의 로컬 YYYY-MM-DD 목록. */
export function windowYmds(center: Date, radius: number): string[] {
  const out: string[] = [];
  for (let off = -radius; off <= radius; off++) {
    const d = new Date(center);
    d.setDate(d.getDate() + off);
    out.push(ymdLocal(d));
  }
  return out;
}

export interface DayIndexEntry {
  id: number;
  /** Day.date 의 ISO 문자열. */
  date: string;
}

/**
 * 윈도우 안에서 아직 캐시에 없는 Day 를 찾아, 한 번에 받을 날짜 범위를 만든다.
 * 받을 게 없으면 null. (Day 인덱스에 없는 날짜 = Day 미생성 → 받을 일정 없음.)
 */
export function missingFetchRange(
  center: Date,
  radius: number,
  index: readonly DayIndexEntry[],
  loadedIds: ReadonlySet<number>,
): { from: string; to: string } | null {
  const win = new Set(windowYmds(center, radius));
  const missing = index
    .filter((e) => !loadedIds.has(e.id) && win.has(ymdLocal(new Date(e.date))))
    .map((e) => ymdLocal(new Date(e.date)))
    .sort();
  if (missing.length === 0) return null;
  return { from: missing[0], to: missing[missing.length - 1] };
}
