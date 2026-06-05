import type { MetadataRoute } from "next";

import { getCanonicalOrigin } from "@/lib/app-url";

/**
 * spec 057 — 검색 노출 최소.
 *
 * 공개 페이지는 크롤 허용, 로그인 뒤 앱 본체(동적·인증)는 disallow. 동적 앱이라
 * 색인 가치가 낮아 공개 표면만 노출한다(Clarification 2).
 */
const DISALLOW = ["/trips", "/settings", "/day", "/auth", "/api"];

export default function robots(): MetadataRoute.Robots {
  const origin = getCanonicalOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: DISALLOW,
    },
    ...(origin ? { sitemap: `${origin}/sitemap.xml` } : {}),
  };
}
