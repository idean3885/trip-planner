import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import ScrollToTop from "@/components/ScrollToTop";
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
      <body className={`${inter.className} bg-white text-gray-900 min-h-screen`}>
        <main className="max-w-content mx-auto w-full px-4 py-6 pb-16">
          {children}
        </main>
        <ScrollToTop />
      </body>
    </html>
  );
}
