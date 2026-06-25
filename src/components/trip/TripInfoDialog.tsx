"use client";

/**
 * spec 063 후속 — "여행 정보" 다이얼로그.
 *
 * 무슨 여행인지(동행자 인원 + 설명)를 햄버거 메뉴 안에서 본다. 편집 권한이 있으면
 * 설명을 바로 수정·저장한다(기존 PUT /api/trips/:id 의 description 재사용). 밖으로
 * 나가지 않고 한 뎁스 안에서 확인·수정한다. 기간 수정은 별도 "일정 변경" 항목 담당.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function TripInfoDialog({
  tripId,
  memberCount,
  description,
  canEdit,
}: {
  tripId: number;
  memberCount: number;
  /** 현재 설명(원문). 없으면 null. */
  description: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(description ?? "");
  const [busy, setBusy] = useState(false);

  function reset() {
    setText(description ?? "");
    setEditing(false);
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: text.trim() }),
      });
      if (!res.ok) {
        toast.error("설명 저장에 실패했습니다");
        return;
      }
      toast.success("여행 설명을 저장했습니다");
      setEditing(false);
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger
        render={<Button type="button" variant="ghost" size="sm" />}
      >
        여행 정보
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>여행 정보</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground text-xs">동행자 {memberCount}명</p>
          {editing ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder="어떤 여행인지 설명 (선택)"
              className="border-border bg-background focus:ring-ring w-full resize-y rounded-md border px-3 py-2 text-sm outline-none ring-1 ring-transparent transition-colors"
            />
          ) : description ? (
            <p className="text-foreground whitespace-pre-wrap">{description}</p>
          ) : (
            <p className="text-muted-foreground">아직 설명이 없습니다.</p>
          )}
        </div>
        <DialogFooter>
          {editing ? (
            <>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={reset}
              >
                취소
              </Button>
              <Button type="button" disabled={busy} onClick={save}>
                {busy ? "저장 중…" : "저장"}
              </Button>
            </>
          ) : (
            <>
              <DialogClose render={<Button type="button" variant="ghost" />}>
                닫기
              </DialogClose>
              {canEdit && (
                <Button type="button" onClick={() => setEditing(true)}>
                  설명 수정
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
