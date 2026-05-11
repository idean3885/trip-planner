"use client";

import Link from "next/link";
import Script from "next/script";

export default function DocsPage() {
  return (
    <div className="relative w-screen min-h-[calc(100vh-3.5rem)] ml-[calc(50%-50vw)]">
      <nav className="mx-auto flex max-w-screen-2xl items-center gap-2 px-6 pt-4 pb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          홈
        </Link>
        <span aria-hidden>·</span>
        <span className="text-foreground">API 문서</span>
      </nav>
      <div
        id="api-reference"
        data-url="/api/openapi"
        data-configuration={JSON.stringify({
          theme: "default",
          hideDownloadButton: true,
          layout: "modern",
        })}
        className="mx-auto max-w-screen-2xl px-2"
      />
      <Script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference" />
    </div>
  );
}
