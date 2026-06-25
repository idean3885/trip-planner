"use client";

/**
 * spec 062 후속 — 작은 "?" 도움말 팝오버(툴팁).
 *
 * 데스크탑은 마우스 오버, 모바일은 탭(클릭)으로 열린다. 바깥 클릭·Esc 로 닫는다.
 * 외부 의존성 없이 제어형으로 구현(헌법 II — 신규 의존성 없음). 환산 기준처럼
 * "왜 이 값인가"를 본문 옆에 붙여 설명할 때 쓴다.
 */

import { useEffect, useRef, useState } from "react";

export function InfoHint({
  text,
  label = "설명 보기",
}: {
  /** 말풍선 본문. */
  text: string;
  /** 접근성 라벨. */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

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
    <span
      ref={ref}
      className="relative inline-flex align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => {
          // 카드 등 상위 링크 안에 놓여도 도움말 토글이 네비게이션을 트리거하지 않게.
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="border-muted-foreground/40 text-muted-foreground hover:bg-muted hover:text-foreground flex size-3.5 items-center justify-center rounded-full border text-[9px] leading-none font-semibold"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="bg-popover text-popover-foreground border-border absolute top-full left-1/2 z-50 mt-1 w-max max-w-[14rem] -translate-x-1/2 rounded-md border p-2 text-xs leading-relaxed font-normal whitespace-pre-line shadow-md"
        >
          {text}
        </span>
      )}
    </span>
  );
}
