import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "여행 일정",
  description: "여행 일정 & 플래너",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.className} bg-white text-gray-900 min-h-screen`}>
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-content mx-auto px-4 h-14 flex items-center">
            <Link
              href="/"
              className="text-lg font-bold tracking-tight hover:text-blue-600 transition-colors"
            >
              여행 일정
            </Link>
          </div>
        </header>
        <main className="max-w-content mx-auto w-full px-4 py-6 pb-16">
          {children}
        </main>
      </body>
    </html>
  );
}
