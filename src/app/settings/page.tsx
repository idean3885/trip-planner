"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";

interface Token {
  id: number;
  name: string;
  token?: string; // 생성 직후에만 존재
  tokenPrefix: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [newTokenName, setNewTokenName] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchTokens = useCallback(async () => {
    const res = await fetch("/api/tokens");
    if (res.ok) setTokens(await res.json());
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchTokens();
  }, [status, fetchTokens]);

  if (status === "loading") return <p>로딩 중...</p>;
  if (status === "unauthenticated") return <p>로그인이 필요합니다.</p>;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTokenName.trim() || loading) return;

    setLoading(true);
    setCreatedToken(null);
    setCopied(false);

    const res = await fetch("/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTokenName.trim() }),
    });

    if (res.ok) {
      const data = await res.json();
      setCreatedToken(data.token);
      setNewTokenName("");
      await fetchTokens();
    }

    setLoading(false);
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/tokens/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTokens((prev) => prev.filter((t) => t.id !== id));
    }
  }

  async function handleCopy() {
    if (createdToken) {
      await navigator.clipboard.writeText(createdToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">설정</h1>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">API 토큰</h2>
        <p className="text-sm text-surface-600">
          외부 도구(MCP 서버 등)에서 API를 호출할 때 사용하는 인증 토큰입니다.
        </p>

        {/* 토큰 생성 */}
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            value={newTokenName}
            onChange={(e) => setNewTokenName(e.target.value)}
            placeholder="토큰 이름 (예: My MacBook)"
            maxLength={100}
            className="flex-1 border rounded px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={loading || !newTokenName.trim()}
            className="bg-primary-600 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
          >
            생성
          </button>
        </form>

        {/* 생성된 토큰 노출 (1회) */}
        {createdToken && (
          <div className="bg-green-50 border border-green-200 rounded p-4 space-y-2">
            <p className="text-sm font-medium text-green-800">
              토큰이 생성되었습니다. 이 값은 다시 표시되지 않으니 복사해두세요.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white border rounded px-3 py-2 text-xs break-all select-all">
                {createdToken}
              </code>
              <button
                onClick={handleCopy}
                className="bg-green-600 text-white px-3 py-2 rounded text-xs font-medium shrink-0"
              >
                {copied ? "복사됨" : "복사"}
              </button>
            </div>
          </div>
        )}

        {/* 토큰 목록 */}
        {tokens.length === 0 ? (
          <p className="text-sm text-surface-500">생성된 토큰이 없습니다.</p>
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
                  onClick={() => handleDelete(token.id)}
                  className="text-red-600 text-sm hover:underline"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
