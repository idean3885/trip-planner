"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export default function DocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@scalar/api-reference";
    script.onload = () => {
      if (containerRef.current && containerRef.current.children.length === 0) {
        const el = document.createElement("api-reference");
        el.setAttribute("data-url", "/api/openapi");
        el.setAttribute("data-configuration", JSON.stringify({
          theme: "default",
          hideDownloadButton: true,
        }));
        containerRef.current.appendChild(el);
      }
    };
    document.head.appendChild(script);
  }, []);

  return (
    <div className="min-h-screen -mx-4 -mt-6">
      <div className="px-4 pt-4 pb-2 flex items-center gap-2 text-body-sm text-surface-500">
        <Link href="/" className="hover:text-surface-700">홈</Link>
        <span>/</span>
        <span className="text-surface-700">API 문서</span>
      </div>
      <div ref={containerRef} />
    </div>
  );
}
