"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTripPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          startDate: startDate || null,
          endDate: endDate || null,
        }),
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
            placeholder="포르투갈 & 스페인 여행"
            required
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              시작일
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              종료일
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClass}
            />
          </div>
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
