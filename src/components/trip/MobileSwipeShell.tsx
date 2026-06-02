"use client";

/**
 * spec 029 T024 — mobile 하단 영역 in-place swap shell.
 *
 * mobile (<1024px) 에서 캘린더에서 날짜를 선택하면 `swapView` 가 노출되고,
 * 좌 스와이프 / "뒤로" 버튼 / ESC 키로 `defaultView` 로 복귀한다.
 * URL 은 변경하지 않는다(브라우저 history 비변경). 키보드 사용자를 위해
 * 좌 스와이프 외 "뒤로" 버튼 + ESC 가 항상 같이 제공된다.
 */

import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useSwipeable } from "react-swipeable";

import { Button } from "@/components/ui/button";

export interface MobileSwipeShellProps {
  isSwapped: boolean;
  onSwapBack: () => void;
  defaultView: React.ReactNode;
  swapView: React.ReactNode;
}

export function MobileSwipeShell({
  isSwapped,
  onSwapBack,
  defaultView,
  swapView,
}: MobileSwipeShellProps) {
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (isSwapped) onSwapBack();
    },
    preventScrollOnSwipe: false,
    trackMouse: false,
  });

  useEffect(() => {
    if (!isSwapped) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onSwapBack();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSwapped, onSwapBack]);

  if (!isSwapped) {
    return <div>{defaultView}</div>;
  }

  return (
    <div {...handlers} className="space-y-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onSwapBack}
        aria-label="기본 일정 목록으로 돌아가기"
        className="text-muted-foreground gap-1 text-sm"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        뒤로
      </Button>
      <div>{swapView}</div>
    </div>
  );
}
