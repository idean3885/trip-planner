"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * spec 060 (#793) — 헤드리스 device 인증 승인 카드.
 * 사람이 자기 기기에서 user_code 를 확인하고 승인/거부한다. 승인은 본인 세션으로
 * `/api/auth/device/approve` 에 전달되며, 토큰은 소비자의 다음 폴링이 받아간다.
 */
export default function DeviceApproveCard({ userCode }: { userCode: string }) {
  const [state, setState] = useState<"idle" | "approved" | "denied" | "error">(
    "idle",
  );
  const [busy, setBusy] = useState(false);

  async function submit(decision: "approve" | "deny") {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/device/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_code: userCode, decision }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setState(decision === "approve" ? "approved" : "denied");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  if (state === "approved") {
    return (
      <p className="text-foreground text-sm">
        승인 완료! 사용하던 도구로 돌아가세요. 이 창은 닫아도 됩니다.
      </p>
    );
  }
  if (state === "denied") {
    return (
      <p className="text-muted-foreground text-sm">요청을 거부했습니다.</p>
    );
  }
  if (state === "error") {
    return (
      <p className="text-destructive text-sm">
        처리하지 못했습니다. 요청이 만료되었을 수 있으니 도구에서 다시
        시도해 주세요.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm">로그인 요청 코드</p>
        <p className="text-foreground text-lg font-semibold tracking-widest tabular-nums">
          {userCode}
        </p>
      </div>
      <p className="text-muted-foreground text-sm">
        이 기기에서 본인 계정으로 로그인 요청을 승인하시겠습니까?
      </p>
      <div className="flex gap-2">
        <Button onClick={() => submit("approve")} disabled={busy} size="sm">
          {busy ? "처리 중..." : "승인"}
        </Button>
        <Button
          onClick={() => submit("deny")}
          disabled={busy}
          variant="ghost"
          size="sm"
        >
          거부
        </Button>
      </div>
    </div>
  );
}
