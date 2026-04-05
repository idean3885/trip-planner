import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "여행 일정",
  description: "포르투갈 & 스페인 신혼여행 일정",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              여행 일정
            </Link>
          </div>
        </header>
        <main className="max-w-2xl mx-auto w-full px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
