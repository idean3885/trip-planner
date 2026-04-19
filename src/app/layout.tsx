import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import ScrollToTop from "@/components/ScrollToTop";
import SessionProvider from "@/components/SessionProvider";
import AuthButton from "@/components/AuthButton";
import Footer from "@/components/Footer";
import { Toaster } from "@/components/ui/sonner";
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
      <body className={`${inter.className} flex min-h-screen flex-col bg-background text-foreground`}>
        <SessionProvider>
          <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 pt-4">
            <Link
              href="/"
              className="text-sm font-semibold text-foreground/80 hover:text-foreground"
            >
              우리의 여행
            </Link>
            <AuthButton />
          </header>
          <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-16">
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
