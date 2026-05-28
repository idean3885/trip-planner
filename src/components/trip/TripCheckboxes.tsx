"use client";

/**
 * spec 029 T032 — 통합 캘린더 사이드 체크박스.
 *
 * 사용자가 속한 trip 목록을 라벨 + 체크박스로 노출. 부모 컴포넌트가
 * `checkedTripIds` 와 `onToggle` 을 관리한다. 현재 trip 만 default 체크 정책은
 * 부모 컴포넌트(`TripDetailLayout`) 의 초기 state 에서 결정한다.
 *
 * shadcn Checkbox 컴포넌트를 vendor 하지 않고 native input 사용 — 단일 페이지
 * 1회 사용처라 추가 컴포넌트 비용이 큰 의미가 없다.
 */

import { getTripColor } from "@/lib/trip-palette";

export interface TripCheckboxOption {
  id: number;
  title: string;
}

export interface TripCheckboxesProps {
  trips: TripCheckboxOption[];
  checkedTripIds: ReadonlySet<number>;
  onToggle: (tripId: number, checked: boolean) => void;
  className?: string;
}

export function TripCheckboxes({
  trips,
  checkedTripIds,
  onToggle,
  className,
}: TripCheckboxesProps) {
  if (trips.length === 0) return null;

  return (
    <ul className={className}>
      {trips.map((t) => {
        const color = getTripColor(t.id);
        const checked = checkedTripIds.has(t.id);
        return (
          <li key={t.id}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onToggle(t.id, e.target.checked)}
                className="size-4 rounded border-border accent-foreground"
                aria-label={`${t.title} 캘린더에 표시`}
              />
              <span
                aria-hidden
                className="size-3 rounded-full"
                style={{ backgroundColor: color.cssVar }}
              />
              <span className="truncate">{t.title}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
