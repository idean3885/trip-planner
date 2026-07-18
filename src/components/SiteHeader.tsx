"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import AuthButton from "@/components/AuthButton";

/**
 * spec 067 — 앱 셸 헤더(글래스 바).
 *
 * 대문(`/`)은 Hero 가 이미 '우리의 여행' 브랜딩과 시작하기 CTA 를 가져 헤더 바가
 * 중복·공간 낭비다. 대문에서만 헤더를 숨기고, 앱 페이지(목록·상세 등)에선 홈 이동·
 * 여행 목록·로그인 진입점을 담은 내비게이션 헤더로 유지한다.
 *
 * sticky 미승격(spec 065) — 여행 상세 모바일 주간 달력 sticky offset 충돌 회피.
 */
export default function SiteHeader() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <header className="lg:max-w-wide mx-auto w-full max-w-2xl px-4 pt-4">
      <div className="glass-surface ring-foreground/10 flex items-center justify-between gap-2 rounded-xl px-4 py-2.5 shadow-xs ring-1 sm:gap-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-foreground/80 hover:text-foreground shrink-0 text-sm font-semibold whitespace-nowrap"
          >
            우리의 여행
          </Link>
          {/* spec 026 묶음 D — 데스크탑 ≥1024px에서 주요 액션 가로 노출. 모바일은 로고만. */}
          {/* API 문서는 일반 사용자에게 불필요해 헤더에서 제외(#899). 진입점은 대문 하단·푸터에 유지. */}
          <nav className="text-muted-foreground hidden items-center gap-4 text-sm lg:flex">
            <Link href="/trips" className="hover:text-foreground">
              여행 목록
            </Link>
          </nav>
        </div>
        <AuthButton />
      </div>
    </header>
  );
}
