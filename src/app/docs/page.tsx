"use client";

import Link from "next/link";
import Script from "next/script";

export default function DocsPage() {
  return (
    <div className="min-h-screen -mx-4 -mt-6">
      <nav className="flex items-center gap-2 px-4 pt-4 pb-2 text-sm text-muted-foreground">
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
        })}
      />
      <Script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference" />
    </div>
  );
}
