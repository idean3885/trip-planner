import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import ScrollToTop from "@/components/ScrollToTop";
import SessionProvider from "@/components/SessionProvider";
import AuthButton from "@/components/AuthButton";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="ko">
      <body className={`${inter.className} bg-white text-surface-900 min-h-screen`}>
        <SessionProvider>
          <header className="max-w-content mx-auto w-full px-4 pt-4 flex items-center justify-between">
            <Link href="/" className="text-body-sm font-semibold text-surface-700 hover:text-surface-900">
              우리의 여행
            </Link>
            <AuthButton />
          </header>
          <main className="max-w-content mx-auto w-full px-4 py-6 pb-16">
            {children}
          </main>
          <ScrollToTop />
        </SessionProvider>
      </body>
    </html>
  );
}
