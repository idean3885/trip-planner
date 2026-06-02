"use client";

import { type ReactNode, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface InviteButtonProps {
  tripId: number;
  /** 현재 동행자 목록(서버 컴포넌트). 다이얼로그 상단에 함께 보여준다(spec 041). */
  memberList?: ReactNode;
}

/**
 * spec 041 — 단일 "동행자 초대" 진입점. 호스트/게스트 두 버튼을 하나로 합치고,
 * 다이얼로그 안에서 현재 동행자 목록 + 호스트/게스트 차이 설명 + 역할별 초대 링크
 * 복사를 한 묶음으로 제공한다(동선에서 안 보이던 역할 차이를 설명과 함께 노출).
 */
export default function InviteButton({
  tripId,
  memberList,
}: InviteButtonProps) {
  const [loading, setLoading] = useState<"HOST" | "GUEST" | null>(null);

  async function handleInvite(role: "HOST" | "GUEST") {
    setLoading(role);
    try {
      const res = await fetch(`/api/trips/${tripId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("초대 링크 생성 실패");
      const { inviteUrl } = await res.json();
      await navigator.clipboard.writeText(inviteUrl);
      toast.success(
        `${role === "HOST" ? "호스트" : "게스트"} 초대 링크가 복사되었습니다`,
      );
    } catch {
      toast.error("초대 링크 생성에 실패했습니다.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Dialog>
      <DialogTrigger
        render={<Button type="button" variant="outline" size="sm" />}
      >
        동행자 초대
      </DialogTrigger>
      <DialogContent fullSheetOnMobile>
        <DialogHeader>
          <DialogTitle>동행자</DialogTitle>
        </DialogHeader>

        {memberList}

        <div className="space-y-3">
          <div className="text-muted-foreground space-y-1 text-sm">
            <p>초대 링크를 보내 동행자를 추가합니다.</p>
            <p>
              <span className="text-foreground font-medium">호스트</span>는
              일정·동행자를 편집할 수 있고,{" "}
              <span className="text-foreground font-medium">게스트</span>는
              열람만 할 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleInvite("HOST")}
              disabled={loading !== null}
            >
              호스트 링크 복사
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleInvite("GUEST")}
              disabled={loading !== null}
            >
              게스트 링크 복사
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
