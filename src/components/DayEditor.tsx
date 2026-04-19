"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
  const [tab, setTab] = useState<"edit" | "preview">("edit");

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
        <Tabs value={tab} onValueChange={(v) => setTab(v as "edit" | "preview")}>
          <div className="flex items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="edit">편집</TabsTrigger>
              <TabsTrigger value="preview">미리보기</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setContent(initialContent);
                  setIsEditing(false);
                  setTab("edit");
                }}
              >
                취소
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>

          <TabsContent value="edit">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[400px] rounded-xl border border-border bg-background p-4 font-mono text-sm leading-relaxed outline-none ring-1 ring-transparent transition-colors focus:ring-ring"
            />
          </TabsContent>
          <TabsContent value="preview">
            <div className="min-h-[400px] rounded-xl border border-border bg-background p-4">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {canEditProp && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            편집
          </Button>
        </div>
      )}
      <div
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
