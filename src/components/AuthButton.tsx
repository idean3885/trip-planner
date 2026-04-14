"use client";

import { useSession, signOut } from "next-auth/react";

export default function AuthButton() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  const displayName = session.user.email || session.user.name || "사용자";

  return (
    <div className="flex items-center gap-3">
      <span className="text-body-sm text-surface-500">
        {displayName}
      </span>
      <button
        onClick={() => signOut()}
        className="rounded-md px-3 py-1.5 text-body-sm text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-700"
      >
        로그아웃
      </button>
    </div>
  );
}
