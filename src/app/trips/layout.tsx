import type { Metadata } from "next";

/**
 * spec 057 — 로그인 뒤 앱 본체는 검색 색인에서 제외(robots.ts disallow와 이중 방어).
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function TripsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
