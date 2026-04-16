"use client";

import Link from "next/link";
import Script from "next/script";

export default function DocsPage() {
  return (
    <div className="min-h-screen -mx-4 -mt-6">
      <div className="px-4 pt-4 pb-2 flex items-center gap-2 text-body-sm text-surface-500">
        <Link href="/" className="hover:text-surface-700">홈</Link>
        <span>/</span>
        <span className="text-surface-700">API 문서</span>
      </div>
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
