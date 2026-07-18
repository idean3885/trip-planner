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
      {/* 항상 마운트, 표시만 토글(열린 다이얼로그 보존). #964 — 표면·등장
          애니메이션을 계정 메뉴(DropdownMenuContent)와 동일하게 맞춘다: glass-overlay
          유리 표면 + ring-1 + rounded-lg + fade/zoom/slide 등장. 자식(다이얼로그)을
          항상 마운트해야 해 base-ui Menu 로 바꾸지 않고 표면만 통일한다(닫힘 애니메이션은
          hidden 토글 특성상 생략). */}
      <div
        role="menu"
        data-state={open ? "open" : "closed"}
        className={cn(
          "glass-overlay text-popover-foreground ring-foreground/10 absolute top-full right-0 z-50 mt-1 w-60 origin-top-right flex-col gap-0.5 rounded-lg p-1.5 shadow-md ring-1 duration-100",
          // #967 — 자식 트리거 버튼을 계정 메뉴(DropdownMenuItem)와 같은 flat 항목으로
          // 스코프한다: 테두리·그림자·배경을 벗기고 전폭 좌측 정렬, hover=bg-accent.
          // 각 컴포넌트의 variant 를 건드리지 않아 다른 사용처(컴포넌트 갤러리)는 그대로다.
          "[&>button:hover]:bg-accent [&>button]:h-auto [&>button]:w-full [&>button]:justify-start [&>button]:gap-1.5 [&>button]:rounded-md [&>button]:border-0 [&>button]:bg-transparent [&>button]:px-2 [&>button]:py-1.5 [&>button]:font-normal [&>button]:shadow-none",
          open
            ? "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 flex"
            : "hidden",
        )}
      >
        {children}
      </div>
    </div>
  );
}
