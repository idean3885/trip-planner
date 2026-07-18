"use client";

import { LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * spec 069 — 헤더 계정 메뉴.
 *
 * 이전에는 이메일·설정·로그아웃을 헤더에 flat 하게 나열하고, 좁은 화면 넘침(#641)을
 * 뷰포트별 표시/숨김 분기로 봉합했다 — "웹/모바일 단일 반응형" 원칙 위반.
 * 세 항목을 단일 계정 메뉴(이니셜 원형 트리거 → 드롭다운)로 접어 분기를 없앤다.
 * 여행 컨텍스트 액션(TripActionsMenu, ☰)과는 스코프가 달라 병합하지 않고 분리 유지한다.
 * 드롭다운은 포털 기반이라 sticky 캘린더 등과의 z-index 충돌이 없다.
 */
export default function AuthButton() {
  const { data: session } = useSession();
  const router = useRouter();

  if (!session?.user) return null;

  const name = session.user.name ?? "";
  const email = session.user.email ?? "";
  const label = email || name || "사용자";
  const initial = (name || email || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="계정 메뉴"
        className="border-border bg-card text-foreground hover:bg-muted focus-visible:ring-ring flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors outline-none focus-visible:ring-2"
      >
        {initial}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* #948 — GroupLabel(이메일)은 반드시 Group 안에 있어야 base-ui 가 크래시하지
            않는다. Item 에 render={<Link>} 도 크래시하므로 onClick 라우팅을 쓴다. */}
        <DropdownMenuGroup>
          {/* 이메일 — 정체성 확인용 읽기전용 라벨(상단). */}
          <DropdownMenuLabel className="truncate normal-case">
            {label}
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <Settings aria-hidden />
            설정
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut aria-hidden />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
