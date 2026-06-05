import type { MetadataRoute } from "next";

import { getCanonicalOrigin } from "@/lib/app-url";

/**
 * spec 057 — 공개 페이지만 사이트맵에 포함.
 *
 * 랜딩(/)·소개(/about)·문서(/docs)만 색인 대상. 로그인 뒤 경로는 포함하지 않는다.
 * canonical origin 미설정 시 빈 사이트맵(앱 정상).
 */
const PUBLIC_PATHS = ["/", "/about", "/docs"];

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getCanonicalOrigin();
  if (!origin) return [];
  return PUBLIC_PATHS.map((path) => ({
    url: `${origin}${path === "/" ? "" : path}`,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.5,
  }));
}
