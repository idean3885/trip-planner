"use client";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-body-sm text-surface-500">
        <a href="/" className="hover:text-surface-700">홈</a>
        <span>/</span>
        <span className="text-surface-700">새 여행</span>
      </div>
      <h1 className="text-heading-lg font-bold">새 여행</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-body-sm font-medium text-surface-700 mb-1">
            여행 제목
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="포르투갈 & 스페인 여행"
            required
            className="w-full rounded-lg border border-surface-200 px-4 py-2.5 text-body-md focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-body-sm font-medium text-surface-700 mb-1">
              시작일
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-surface-200 px-4 py-2.5 text-body-md focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-body-sm font-medium text-surface-700 mb-1">
              종료일
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-surface-200 px-4 py-2.5 text-body-md focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="w-full rounded-lg bg-surface-900 px-4 py-3 text-body-md font-medium text-white transition-colors hover:bg-surface-700 disabled:opacity-50"
        >
          {saving ? "생성 중..." : "여행 만들기"}
        </button>
      </form>
    </div>
  );
}
