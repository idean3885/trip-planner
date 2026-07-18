"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DeleteTripButtonProps {
  tripId: number;
  tripTitle: string;
}

export default function DeleteTripButton({
  tripId,
  tripTitle,
}: DeleteTripButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = await res
          .json()
          .catch(() => ({ error: "삭제 실패" }));
        throw new Error(error || "삭제 실패");
      }
      setOpen(false);
      router.push("/");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "여행 삭제에 실패했습니다.");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* #967 — ☰ 메뉴 flat 항목 통일: solid destructive(흰 글자)는 패널이 배경을
          벗기면 안 보이므로 ghost + 빨강 글자로 둔다(일자 삭제와 통일). 실제 확정은
          다이얼로그 푸터의 solid destructive 버튼이 담당한다. */}
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
          >
            여행 삭제
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>여행 삭제</DialogTitle>
          <DialogDescription>
            &ldquo;{tripTitle}&rdquo; 여행을 삭제하시겠습니까? 이 작업은 되돌릴
            수 없으며, 모든 일정과 활동이 함께 삭제됩니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "삭제 중..." : "삭제"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
