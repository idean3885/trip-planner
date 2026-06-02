import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";

import AuthButton from "@/components/AuthButton";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SessionProvider from "@/components/SessionProvider";
import { Toaster } from "@/components/ui/sonner";

// spec 055 — Inter 를 CSS 변수(--font-inter)로 노출해 @theme 의 --font-sans/
// --font-heading 정본과 연결한다. className 직접 적용도 유지(폴백 보장).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "우리의 여행",
  description: "우리의 여행 일정 플래너",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={inter.variable}>
      <body
        className={`${inter.className} bg-background text-foreground flex min-h-screen flex-col`}
      >
        <SessionProvider>
          <header className="lg:max-w-wide mx-auto flex w-full max-w-2xl items-center justify-between gap-2 px-4 pt-4 sm:gap-4">
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="text-foreground/80 hover:text-foreground shrink-0 text-sm font-semibold whitespace-nowrap"
              >
                우리의 여행
              </Link>
              {/* spec 026 묶음 D — 데스크탑 ≥1024px에서 주요 액션 가로 노출. 모바일은 로고만. */}
              <nav className="text-muted-foreground hidden items-center gap-4 text-sm lg:flex">
                <Link href="/trips" className="hover:text-foreground">
                  여행 목록
                </Link>
                <Link href="/docs" className="hover:text-foreground">
                  API 문서
                </Link>
              </nav>
            </div>
            <AuthButton />
          </header>
          <main className="lg:max-w-wide mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-16">
            {children}
          </main>
          <ScrollToTop />
          <Footer />
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
