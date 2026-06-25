"use client";

/**
 * spec 063 후속 — 여행 동작 햄버거 메뉴.
 *
 * 액션 버튼이 늘어 화면을 채우던 것을 우상단 ☰ 한 곳으로 모은다(작은 화면 정리).
 * 클릭하면 드롭다운 패널이 열리고, 안에 동작 항목(여행 정보·기간 변경·일자 삭제·
 * 캘린더 가져오기·동행자 초대·나가기/삭제)이 세로로 놓인다.
 *
 * 패널 내용은 항상 마운트하고 표시만 토글한다 — 항목이 연 다이얼로그가 패널을
 * 닫아도 사라지지 않게(언마운트 방지). 바깥 클릭·Esc 로 패널을 닫는다.
 */

import { Menu } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export function TripActionsMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        type="button"
        aria-label="여행 메뉴"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="border-border text-foreground hover:bg-muted flex size-9 items-center justify-center rounded-md border transition-colors"
      >
        <Menu className="size-4" aria-hidden />
      </button>
      {/* 항상 마운트, 표시만 토글(열린 다이얼로그 보존). */}
      <div
        role="menu"
        className={cn(
          "bg-popover border-border absolute top-full right-0 z-50 mt-1 w-60 flex-col gap-1 rounded-md border p-1.5 shadow-md",
          open ? "flex" : "hidden",
        )}
      >
        {children}
      </div>
    </div>
  );
}
