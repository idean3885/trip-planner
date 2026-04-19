"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState, useCallback } from "react";

interface Token {
  id: number;
  name: string;
  token?: string; // 생성 직후에만 존재
  tokenPrefix: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

const INSTALL_GUIDE_URL = "https://github.com/idean3885/trip-planner#2-ai-에이전트로-검색--자동-일정-생성";

export default function SettingsPage() {
  const { status } = useSession();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [newTokenName, setNewTokenName] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
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

  async function handleRevoke(id: number, name: string) {
    if (!window.confirm(`"${name}" 토큰을 폐기하시겠습니까? 해당 장치의 API 호출이 즉시 차단됩니다.`)) return;
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
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          홈
        </Link>
        <span aria-hidden>·</span>
        <span className="text-foreground">설정</span>
      </nav>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">설정</h1>
        <Link
          href="/docs"
          className="text-sm text-foreground underline-offset-4 hover:underline"
        >
          API 문서
        </Link>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">API 토큰</h2>
        <p className="text-sm text-foreground/80">
          보통은{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">install.sh</code>{" "}
          설치 시 장치별로 자동 발급됩니다.{" "}
          <a
            href={INSTALL_GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline-offset-4 hover:underline"
          >
            설치 가이드
          </a>
        </p>
        <p className="text-xs text-muted-foreground">
          API를 직접 호출할 때 사용하는 인증 토큰입니다. 외부 도구(MCP 서버,
          스크립트)에서 Bearer로 전달.{" "}
          <a
            href="/docs"
            className="text-foreground underline-offset-4 hover:underline"
          >
            API 문서
          </a>
        </p>

        {/* 발급된 토큰 목록 */}
        {tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            발급된 토큰이 없습니다.
          </p>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {tokens.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {token.name}
                    </span>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {token.tokenPrefix}...
                    </code>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {token.lastUsedAt
                      ? `마지막 사용: ${new Date(token.lastUsedAt).toLocaleDateString("ko-KR")}`
                      : "사용 기록 없음"}
                    {token.expiresAt &&
                      ` · 만료: ${new Date(token.expiresAt).toLocaleDateString("ko-KR")}`}
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(token.id, token.name)}
                  className="text-sm text-destructive hover:underline"
                >
                  폐기
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 수동 발급 (고급) — 웹 전용 유저용 */}
        <details className="rounded-lg border border-border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground hover:bg-muted">
            수동 발급 (고급)
          </summary>
          <div className="space-y-3 px-4 pb-4">
            <p className="text-xs text-muted-foreground">
              CLI 설치 없이 웹에서 직접 토큰이 필요할 때 사용합니다. 생성된 토큰
              원문은 한 번만 표시되므로 즉시 복사하세요.
            </p>

            <form onSubmit={handleCreate} className="flex gap-2">
              <input
                type="text"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                placeholder="토큰 이름 (예: My MacBook)"
                maxLength={100}
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-ring"
              />
              <button
                type="submit"
                disabled={loading || !newTokenName.trim()}
                className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
              >
                생성
              </button>
            </form>

            {createdToken && (
              <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-800">
                  토큰이 생성되었습니다. 이 값은 다시 표시되지 않으니 복사해두세요.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 select-all break-all rounded border border-border bg-background px-3 py-2 text-xs">
                    {createdToken}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium text-white"
                  >
                    {copied ? "복사됨" : "복사"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </details>
      </section>
    </div>
  );
}
