"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";

export default function AuthButton() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  const displayName = session.user.email || session.user.name || "사용자";

  return (
    <div className="flex min-w-0 items-center gap-1 sm:gap-3">
      {/* 좁은 화면(13 mini, 375px)에서 헤더 가로 넘침을 막는다(#641):
          긴 이메일은 sm 미만에서 숨기고, sm 이상에서도 폭을 제한해 줄임표 처리. */}
      <span className="text-muted-foreground hidden max-w-[12rem] truncate text-sm sm:inline-block">
        {displayName}
      </span>
      <Button variant="ghost" size="sm" render={<Link href="/settings" />}>
        설정
      </Button>
      <Button variant="ghost" size="sm" onClick={() => signOut()}>
        로그아웃
      </Button>
    </div>
  );
}
