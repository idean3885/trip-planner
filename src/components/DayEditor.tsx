"use client";

import { useState } from "react";

interface DayEditorProps {
  tripId: number;
  dayId: number;
  initialContent: string;
  initialHtml: string;
  canEdit: boolean;
}

export default function DayEditor({
  tripId,
  dayId,
  initialContent,
  initialHtml,
  canEdit: canEditProp,
}: DayEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [html] = useState(initialHtml);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/days/${dayId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) throw new Error("저장 실패");

      // 저장 후 HTML 재생성을 위해 페이지 새로고침
      window.location.reload();
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (isEditing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-body-sm font-medium text-surface-500">
            마크다운 편집
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setContent(initialContent);
                setIsEditing(false);
              }}
              className="rounded-md px-3 py-1.5 text-body-sm text-surface-500 hover:bg-surface-100"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-surface-900 px-3 py-1.5 text-body-sm text-white hover:bg-surface-700 disabled:opacity-50"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full min-h-[400px] rounded-card border border-surface-200 p-4 text-body-sm font-mono leading-relaxed focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {canEditProp && (
        <div className="flex justify-end">
          <button
            onClick={() => setIsEditing(true)}
            className="rounded-md px-3 py-1.5 text-body-sm text-surface-500 hover:bg-surface-100 hover:text-surface-700"
          >
            편집
          </button>
        </div>
      )}
      <div
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
