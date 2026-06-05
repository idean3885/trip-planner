"use client";

/**
 * spec 057 — 로그인 사용자를 분석에 익명 식별자로 연결.
 *
 * 세션의 내부 사용자 id만 GA user_id로 set한다(PII 미전송). 측정 ID 미설정 시 no-op.
 */

import { useSession } from "next-auth/react";
import { useEffect } from "react";

import { setAnalyticsUser } from "@/lib/analytics";

export default function AnalyticsUserId() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    setAnalyticsUser(userId);
  }, [userId]);

  return null;
}
