"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function AuthButton() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  const displayName = session.user.email || session.user.name || "사용자";

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">{displayName}</span>
      <Button variant="ghost" size="sm" render={<Link href="/settings" />}>
        설정
      </Button>
      <Button variant="ghost" size="sm" onClick={() => signOut()}>
        로그아웃
      </Button>
    </div>
  );
}
