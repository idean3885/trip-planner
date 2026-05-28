"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * spec 029 v3.0.0 contract — 여행 생성 폼은 제목만 받는다. 기간은 첫 일정을
 * 추가하면 derived 값으로 자동 설정. 종전 startDate/endDate 입력은 제거.
 */
export default function NewTripPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });

      if (!res.ok) throw new Error("생성 실패");

      const trip = await res.json();
      router.push(`/trips/${trip.id}`);
    } catch {
      alert("여행 생성에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-base outline-none ring-1 ring-transparent transition-colors focus:ring-ring";

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          홈
        </Link>
        <span aria-hidden>·</span>
        <span className="text-foreground">새 여행</span>
      </nav>
      <h1 className="text-xl font-semibold tracking-tight">새 여행</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            여행 제목
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 제주도 여행"
            required
            className={inputClass}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            기간은 첫 일정을 추가하면 자동으로 설정됩니다.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="w-full rounded-lg bg-foreground px-4 py-3 text-base font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
        >
          {saving ? "생성 중..." : "여행 만들기"}
        </button>
      </form>
    </div>
  );
}
