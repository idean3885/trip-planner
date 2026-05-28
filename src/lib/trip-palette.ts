/**
 * spec 029 T031 — 통합 캘린더에서 trip 라벨 색을 결정적으로 부여한다.
 *
 * Trip ID 기반 hash → palette index. 동일 trip은 항상 같은 색. globals.css
 * `--trip-palette-1`~`--trip-palette-6` 6색 pool 순환. 사용자가 색을 직접
 * 선택할 수 있는 UI 는 본 spec 범위 외 (향후 별도 spec).
 */

const PALETTE_SIZE = 6 as const;

export interface TripColor {
  /** 1..PALETTE_SIZE. globals.css `--trip-palette-${index}` CSS var. */
  index: number;
  /** Tailwind 의 arbitrary value 표기에 바로 사용 가능한 CSS var 참조. */
  cssVar: string;
}

/** Trip ID → palette index (1..PALETTE_SIZE). */
export function getTripColor(tripId: number): TripColor {
  const safe = Number.isFinite(tripId) && tripId >= 0 ? Math.floor(tripId) : 0;
  const index = (safe % PALETTE_SIZE) + 1;
  return {
    index,
    cssVar: `var(--trip-palette-${index})`,
  };
}

export const TRIP_PALETTE_SIZE = PALETTE_SIZE;
