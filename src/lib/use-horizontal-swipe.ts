import { useRef } from "react";
import type { TouchEvent } from "react";

export interface HorizontalSwipeHandlers {
  onTouchStart: (e: TouchEvent) => void;
  onTouchEnd: (e: TouchEvent) => void;
}

/**
 * 좌우(가로) 스와이프 감지 훅(#653).
 *
 * 세로 스크롤은 건드리지 않는다 — 컨테이너에 `touch-action: pan-y`(`touch-pan-y`)
 * 를 함께 줘 브라우저가 세로 스크롤을 그대로 처리하게 하고(#649 회귀 방지),
 * 가로 우세 제스처만 onLeft(다음)/onRight(이전) 로 넘긴다. touchstart↔touchend
 * 의 X·Y 변화량을 비교해 가로가 우세하고 임계를 넘을 때만 동작한다.
 */
export function useHorizontalSwipe(
  onLeft: () => void,
  onRight: () => void,
  threshold = 40,
): HorizontalSwipeHandlers {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onTouchStart: (e) => {
      const t = e.touches[0];
      start.current = t ? { x: t.clientX, y: t.clientY } : null;
    },
    onTouchEnd: (e) => {
      const s = start.current;
      start.current = null;
      const t = e.changedTouches[0];
      if (!s || !t) return;
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      // 가로 우세 + 임계 초과일 때만. 세로 스크롤 제스처는 무시한다.
      if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy)) return;
      if (dx < 0) onLeft();
      else onRight();
    },
  };
}
