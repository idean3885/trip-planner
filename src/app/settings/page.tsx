"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState, useCallback } from "react";

interface Token {
  id: number;
  name: string;
  tokenPrefix: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const { status } = useSession();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [initialized, setInitialized] = useState(false);

  const fetchTokens = useCallback(async () => {
    const res = await fetch("/api/tokens");
    if (res.ok) setTokens(await res.json());
  }, []);

  if (status === "authenticated" && !initialized) {
    setInitialized(true);
    fetchTokens();
  }

  if (status === "loading") return <p>로딩 중...</p>;
  if (status === "unauthenticated") return <p>로그인이 필요합니다.</p>;

  async function handleRevoke(id: number, name: string) {
    if (!window.confirm(`"${name}" 토큰을 폐기하시겠습니까? 해당 장치의 API 호출이 즉시 차단됩니다.`)) return;
    const res = await fetch(`/api/tokens/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTokens((prev) => prev.filter((t) => t.id !== id));
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-body-sm text-surface-500">
        <Link href="/" className="hover:text-surface-700">홈</Link>
        <span>/</span>
        <span className="text-surface-700">설정</span>
      </div>
      <h1 className="text-2xl font-bold">설정</h1>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">발급된 API 토큰</h2>
        <p className="text-sm text-surface-600">
          <code className="text-xs bg-surface-100 px-1 py-0.5 rounded">install.sh</code> 설치 시 장치별로 자동 발급됩니다.
          추가 장치에 설치하거나 토큰을 재발급하려면 해당 장치에서 설치 스크립트를 다시 실행하세요.
        </p>

        {tokens.length === 0 ? (
          <p className="text-sm text-surface-500">발급된 토큰이 없습니다.</p>
        ) : (
          <div className="border rounded divide-y">
            {tokens.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{token.name}</span>
                    <code className="text-xs text-surface-500 bg-surface-100 px-1.5 py-0.5 rounded">
                      {token.tokenPrefix}...
                    </code>
                  </div>
                  <div className="text-xs text-surface-500">
                    {token.lastUsedAt
                      ? `마지막 사용: ${new Date(token.lastUsedAt).toLocaleDateString("ko-KR")}`
                      : "사용 기록 없음"}
                    {token.expiresAt &&
                      ` · 만료: ${new Date(token.expiresAt).toLocaleDateString("ko-KR")}`}
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(token.id, token.name)}
                  className="text-red-600 text-sm hover:underline"
                >
                  폐기
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
