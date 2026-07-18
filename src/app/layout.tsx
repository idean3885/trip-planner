import "./globals.css";

import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import AnalyticsUserId from "@/components/analytics/AnalyticsUserId";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SessionProvider from "@/components/SessionProvider";
import SiteHeader from "@/components/SiteHeader";
import { Toaster } from "@/components/ui/sonner";

// spec 055 — Inter 를 CSS 변수(--font-inter)로 노출해 @theme 의 --font-sans/
// --font-heading 정본과 연결한다. className 직접 적용도 유지(폴백 보장).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// spec 057 — 측정 ID / 검색 소유 확인값은 환경변수. 미설정 시 분석·검증 미적용.
const gaId = process.env.NEXT_PUBLIC_GA_ID;
const siteVerification = process.env.GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  title: "우리의 여행",
  description: "우리의 여행 일정 플래너",
  ...(siteVerification ? { verification: { google: siteVerification } } : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // 브라우저 UI 색 — 페이지 캔버스 그라데이션 상단색과 맞춘다. metadata 문자열이라 토큰화 불가 (#907/#911).
  // eslint-disable-next-line no-restricted-syntax
  themeColor: "#eef6f3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={inter.variable}>
      <body
        className={`${inter.className} text-foreground flex min-h-screen flex-col`}
      >
        <SessionProvider>
          <AnalyticsUserId />
          {/* spec 067 — 헤더는 대문(/)에서 숨김. 상세는 SiteHeader 참조. */}
          <SiteHeader />
          <main className="lg:max-w-wide mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-16">
            {children}
          </main>
          <ScrollToTop />
          <Footer />
          <Toaster />
        </SessionProvider>
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      </body>
    </html>
  );
}
