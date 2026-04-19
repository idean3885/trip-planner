"use client";

import { useEffect, useRef, useState } from "react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY > 300;

      if (scrolled) {
        setVisible(true);
        setFading(false);

        // Reset fade timer
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setFading(true), 2000);
      } else {
        setVisible(false);
        setFading(false);
        if (timerRef.current) clearTimeout(timerRef.current);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timerRef.current) clearTimeout(timerRef.current);
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
      className={`fixed right-4 z-30 flex size-10 items-center justify-center rounded-full bg-foreground/80 text-background shadow-lg backdrop-blur-sm transition-opacity duration-500 hover:bg-foreground active:scale-95 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
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
