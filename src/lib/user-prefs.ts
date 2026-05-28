/**
 * spec 029 T033 — 사용자 prefs localStorage wrapper.
 *
 * 키 네임스페이스: `trip-planner:prefs:v1:<scope>`. v2 가 필요해지면 `v1` →
 * `v2` 로 올리며 기존 키와 공존. typed read/write 만 노출, 직접 localStorage
 * 접근은 호출자에서 금지.
 *
 * SSR 환경(서버 컴포넌트) 에서 호출하면 window 미존재 → 기본값 반환. 클라이언트
 * 컴포넌트("use client") 에서만 의미 있게 동작한다.
 */

const PREFIX = "trip-planner:prefs:v1:" as const;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // 쿠키/스토리지 차단 환경에서는 silent. 사용자 prefs 보존이 best-effort.
  }
}

/**
 * 통합 캘린더에서 체크된 trip ID 목록.
 *
 * scope 별로 다른 set 을 유지: scope="multi-trip-calendar". 다른 prefs 가
 * 추가되면 scope 만 늘리면 된다.
 */
export interface CheckedTripsPref {
  scope: "multi-trip-calendar";
  tripIds: number[];
}

const CHECKED_TRIPS_KEY = "multi-trip-calendar:checked-trip-ids" as const;

export function readCheckedTripIds(): number[] {
  const stored = readJson<number[]>(CHECKED_TRIPS_KEY, []);
  if (!Array.isArray(stored)) return [];
  return stored.filter((v): v is number => Number.isFinite(v));
}

export function writeCheckedTripIds(tripIds: number[]): void {
  const normalized = Array.from(new Set(tripIds.filter((v) => Number.isFinite(v))));
  writeJson(CHECKED_TRIPS_KEY, normalized);
}
