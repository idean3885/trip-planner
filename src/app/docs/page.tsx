"use client";

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
      <div ref={containerRef} />
    </div>
  );
}
