"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

interface LeaveTripButtonProps {
  tripId: number;
  tripTitle: string;
}

export default function LeaveTripButton({ tripId, tripTitle }: LeaveTripButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLeave() {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/leave`, { method: "POST" });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "탈퇴 실패" }));
        throw new Error(error || "탈퇴 실패");
      }
      setOpen(false);
      router.push("/");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "여행 탈퇴에 실패했습니다.");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm">여행 나가기</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>여행 나가기</DialogTitle>
          <DialogDescription>
            &ldquo;{tripTitle}&rdquo; 여행에서 나가시겠습니까? 다시 합류하려면 호스트의 초대 링크가 필요합니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
            취소
          </Button>
          <Button variant="default" onClick={handleLeave} disabled={loading}>
            {loading ? "나가는 중..." : "나가기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
