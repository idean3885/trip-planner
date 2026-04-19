"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ToastTriggers() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => toast("기본 토스트 메시지")}>
        기본
      </Button>
      <Button variant="outline" onClick={() => toast.success("성공했습니다")}>
        Success
      </Button>
      <Button variant="outline" onClick={() => toast.error("실패했습니다")}>
        Error
      </Button>
    </div>
  );
}
