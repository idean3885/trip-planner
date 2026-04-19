/**
 * `/_dev/components` 카탈로그 전용 샘플 상수.
 *
 * 실 DB 쿼리 금지(스펙 013 R-5). 카탈로그는 인증 없이 렌더되어야 하므로
 * 컴파일 타임 상수만 import 한다. 프로덕션 빌드에서는 `(dev)` 경로 자체가
 * `notFound()`로 차단된다(page.tsx).
 */

export const sampleActivity = {
  id: 1,
  category: "SIGHTSEEING" as const,
  title: "도쿄 타워 전망대",
  startTime: "2026-06-07T00:00:00.000Z",
  startTimezone: "Asia/Tokyo",
  endTime: "2026-06-07T02:00:00.000Z",
  endTimezone: "Asia/Tokyo",
  location: "도쿄 · 미나토구 시바코엔",
  memo: "입장권은 https://www.tokyotower.co.jp 에서 사전 구매",
  cost: "1200",
  currency: "JPY",
  reservationStatus: "RECOMMENDED" as const,
  sortOrder: 1,
};

export const sampleActivityAlt = {
  id: 2,
  category: "DINING" as const,
  title: "스시 오마카세",
  startTime: "2026-06-07T10:00:00.000Z",
  startTimezone: "Asia/Tokyo",
  endTime: "2026-06-07T12:00:00.000Z",
  endTimezone: "Asia/Tokyo",
  location: "도쿄 · 긴자",
  memo: null,
  cost: "15000",
  currency: "JPY",
  reservationStatus: "REQUIRED" as const,
  sortOrder: 2,
};
