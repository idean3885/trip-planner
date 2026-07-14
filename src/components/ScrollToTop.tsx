"use client";

import { useEffect, useState } from "react";

export default function ScrollToTop() {
  // 스크롤이 일정 이상 내려간 동안에는 계속 노출한다. 이전에는 2초 무동작 후
  // 사라져(opacity-0 + pointer-events-none) "위로 이동" 용도로 쓰기 어려웠다.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => {
        const start = window.scrollY;
        const duration = Math.min(300, start * 0.15); // 빠르되 부드럽게 (최대 300ms)
        const startTime = performance.now();
        const step = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
          window.scrollTo(0, start * (1 - ease));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }}
      className="bg-foreground/80 text-background hover:bg-foreground fixed right-4 z-30 flex size-10 items-center justify-center rounded-full opacity-100 shadow-lg backdrop-blur-sm transition-opacity duration-300 active:scale-95"
      style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
      aria-label="맨 위로 스크롤"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
}
