"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Calendar, Check, AlertTriangle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  CalendarType,
  FailedItem,
  StatusResponse,
  SyncResponse,
  UnlinkResponse,
} from "@/types/gcal";

interface Props {
  tripId: number;
  /** 현재 사용자의 트립 역할. v2.9.0부터 오너만 연결·해제·sync 가능, 멤버는 subscribe만. */
  role?: "OWNER" | "HOST" | "GUEST";
}

type LocalState =
  | { phase: "loading" }
  | { phase: "ready"; status: StatusResponse }
  | { phase: "error"; message: string };

/**
 * 여행 상세 페이지의 Google Calendar 연동 패널.
 * - 비연결: 캘린더 선택 + "구글 캘린더에 올리기"
 * - 연결됨: 캘린더명 / 마지막 반영 시각 / 건너뜀 / 실패 / 재시도 / 해제
 * - 권한 회수(REVOKED): "다시 연결하기" CTA
 */
export default function GCalLinkPanel({ tripId, role = "OWNER" }: Props) {
  const [state, setState] = useState<LocalState>({ phase: "loading" });
  const [choice] = useState<CalendarType>("DEDICATED"); // v2.9.0: DEDICATED 고정 (PRIMARY 공유 불가)
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<FailedItem[]>([]);
  const isOwner = role === "OWNER";

  const loadStatus = useCallback(async () => {
    const res = await fetch(`/api/trips/${tripId}/gcal/status`);
    if (!res.ok) {
      setState({ phase: "error", message: "상태를 불러오지 못했습니다" });
      return;
    }
    const data = (await res.json()) as StatusResponse;
    setState({ phase: "ready", status: data });
  }, [tripId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // 동의 완료 후 복귀 시 자동 연동 실행 — 세션당 1회만 재시도해 consent 루프 방지(#332)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const qp = new URLSearchParams(window.location.search);
    const action = qp.get("gcal");
    if (action !== "link-ready" && action !== "sync-ready" && action !== "subscribed") {
      return;
    }

    const loopKey = `gcal-auto-${action}-${tripId}`;
    if (window.sessionStorage.getItem(loopKey) === "1") {
      // 이미 한 번 자동 실행했는데 또 같은 신호 → consent가 풀리지 않은 상태.
      // 다시 튕기지 않고 사용자가 직접 버튼을 누르도록 둔다.
      qp.delete("gcal");
      window.history.replaceState(null, "", `${window.location.pathname}`);
      toast.error("구글 캘린더 권한이 아직 반영되지 않았습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    window.sessionStorage.setItem(loopKey, "1");
    qp.delete("gcal");
    window.history.replaceState(null, "", `${window.location.pathname}`);
    if (action === "link-ready") void handleLink("DEDICATED");
    else if (action === "subscribed") void handleSubscribe("add");
    else void handleSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  async function handleLink(calendarType: CalendarType) {
    // v2.9.0: 오너는 새 per-trip 공유 캘린더 엔드포인트 사용. DEDICATED 강제.
    if (isOwner) {
      return handleLinkV2();
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/gcal/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarType }),
      });
      if (res.status === 409) {
        const data = (await res.json()) as {
          error: string;
          authorizationUrl?: string;
        };
        if (data.error === "consent_required" && data.authorizationUrl) {
          window.location.href = data.authorizationUrl;
          return;
        }
      }
      if (!res.ok) {
        toast.error("연동에 실패했습니다");
        return;
      }
      const data = (await res.json()) as SyncResponse;
      setFailed(data.failed);
      // 성공 — 다음 세션에서 자동재시도가 루프로 오판되지 않도록 플래그 제거(#337)
      window.sessionStorage.removeItem(`gcal-auto-link-ready-${tripId}`);
      toast.success(
        data.status === "ok"
          ? "구글 캘린더에 반영했습니다"
          : `부분 반영 · 건너뜀 ${data.summary.skipped} · 실패 ${data.summary.failed}`
      );
      await loadStatus();
    } finally {
      setBusy(false);
    }
  }

  async function handleSync(retryOnly?: number[]) {
    // v2.9.0 오너는 v2 sync 엔드포인트 사용. retryOnly는 현재 v2에서 미지원(향후 확장).
    if (isOwner && !retryOnly) {
      return handleSyncV2();
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/gcal/sync`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(retryOnly ? { retryOnly } : {}),
      });
      if (res.status === 409) {
        const data = (await res.json()) as {
          error: string;
          authorizationUrl?: string;
        };
        if (data.error === "consent_required" && data.authorizationUrl) {
          window.location.href = data.authorizationUrl;
          return;
        }
      }
      if (!res.ok) {
        toast.error("다시 반영에 실패했습니다");
        return;
      }
      const data = (await res.json()) as SyncResponse;
      setFailed(data.failed);
      window.sessionStorage.removeItem(`gcal-auto-sync-ready-${tripId}`);
      toast.success(
        data.status === "ok"
          ? "최신 상태로 반영했습니다"
          : `부분 반영 · 건너뜀 ${data.summary.skipped} · 실패 ${data.summary.failed}`
      );
      await loadStatus();
    } finally {
      setBusy(false);
    }
  }

  async function handleLinkV2() {
    setBusy(true);
    try {
      const res = await fetch(`/api/v2/trips/${tripId}/calendar`, { method: "POST" });
      if (res.status === 409) {
        const data = (await res.json()) as { error: string; authorizationUrl?: string };
        if (data.error === "consent_required" && data.authorizationUrl) {
          window.location.href = data.authorizationUrl;
          return;
        }
      }
      if (!res.ok) {
        toast.error("공유 캘린더 연결에 실패했습니다");
        return;
      }
      const data = (await res.json()) as { status: string; members?: { aclStatus: string }[] };
      const failedMembers =
        data.members?.filter((m) => m.aclStatus === "failed").length ?? 0;
      window.sessionStorage.removeItem(`gcal-auto-link-ready-${tripId}`);
      toast.success(
        data.status === "ok"
          ? "여행당 공유 캘린더를 연결했습니다"
          : `연결 완료 · 권한 부여 실패 ${failedMembers}명(다시 시도 가능)`
      );
      await loadStatus();
    } finally {
      setBusy(false);
    }
  }

  async function handleSyncV2() {
    setBusy(true);
    try {
      const res = await fetch(`/api/v2/trips/${tripId}/calendar/sync`, { method: "POST" });
      if (res.status === 409) {
        const data = (await res.json()) as { error: string; authorizationUrl?: string };
        if (data.error === "consent_required" && data.authorizationUrl) {
          window.location.href = data.authorizationUrl;
          return;
        }
      }
      if (!res.ok) {
        toast.error("반영에 실패했습니다");
        return;
      }
      const data = (await res.json()) as SyncResponse;
      setFailed(data.failed);
      window.sessionStorage.removeItem(`gcal-auto-sync-ready-${tripId}`);
      toast.success(
        data.status === "ok"
          ? "최신 상태로 반영했습니다"
          : `부분 반영 · 건너뜀 ${data.summary.skipped} · 실패 ${data.summary.failed}`
      );
      await loadStatus();
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlinkV2() {
    if (!window.confirm("공유 캘린더 연결을 해제하시겠어요?\n캘린더 자체는 삭제되지 않고 본인 구글 계정에 남습니다.")) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/v2/trips/${tripId}/calendar`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("해제에 실패했습니다");
        return;
      }
      toast.success("해제했습니다");
      setFailed([]);
      await loadStatus();
    } finally {
      setBusy(false);
    }
  }

  async function handleSubscribe(action: "add" | "remove") {
    setBusy(true);
    try {
      const res = await fetch(`/api/v2/trips/${tripId}/calendar/subscribe`, {
        method: action === "add" ? "POST" : "DELETE",
      });
      if (res.status === 409) {
        const data = (await res.json()) as { error: string; authorizationUrl?: string };
        if (data.error === "consent_required" && data.authorizationUrl) {
          window.location.href = data.authorizationUrl;
          return;
        }
      }
      if (!res.ok) {
        toast.error(action === "add" ? "추가에 실패했습니다" : "제거에 실패했습니다");
        return;
      }
      toast.success(
        action === "add"
          ? "내 구글 캘린더에 추가했습니다"
          : "내 구글 캘린더에서 제거했습니다"
      );
      await loadStatus();
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlink() {
    if (isOwner) {
      return handleUnlinkV2();
    }
    if (!window.confirm("구글 캘린더 연결을 해제하시겠어요?\n직접 수정한 이벤트는 보존됩니다.")) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/gcal/link`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("해제에 실패했습니다");
        return;
      }
      const data = (await res.json()) as UnlinkResponse;
      toast.success(
        data.summary.skipped
          ? `해제 완료 · 직접 수정한 이벤트 ${data.summary.skipped}개는 남겨두었습니다`
          : "해제했습니다"
      );
      setFailed([]);
      await loadStatus();
    } finally {
      setBusy(false);
    }
  }

  if (state.phase === "loading") return null;
  if (state.phase === "error") {
    return (
      <p className="text-xs text-muted-foreground">{state.message}</p>
    );
  }

  const status = state.status;

  // ── 트리거 버튼(작게) + 다이얼로그(세부 관리) 패턴 ──
  // 여행 페이지 상단은 아래 일정 스캔이 우선. 캘린더 연동은 버튼 한 개로 접고
  // 클릭 시 다이얼로그로 확장해 연결/해제/동기화 등을 수행한다.

  if (!status.linked) {
    if (!isOwner) {
      // 오너가 아직 연결 안 함. 비-오너에게는 정보 없음 → 아예 렌더 안 함.
      return null;
    }
    return (
      <Dialog>
        <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
          <Calendar className="size-4" />
          구글 캘린더 연결
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>구글 캘린더 (공유) 연결</DialogTitle>
            <DialogDescription>
              여행의 공유 캘린더를 만들고 호스트·게스트에게 자동 권한을 부여합니다.
              구글에서 공유 알림 메일이 발송될 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              취소
            </DialogClose>
            <Button size="sm" onClick={() => void handleLink(choice)} disabled={busy}>
              공유 캘린더 연결
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const link = status.link;
  const isRevoked = link.lastError === "REVOKED";

  if (!isOwner) {
    const sub = status.mySubscription;
    const isAdded = sub?.status === "ADDED";
    // HOST는 트립 편집 권한이 있으므로 sync 트리거도 허용 (서버가 오너 토큰으로 수행).
    // GUEST는 편집 불가라 sync도 안 함.
    const canSync = role === "HOST";

    return (
      <Dialog>
        <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
          {isAdded ? <Check className="size-4" /> : <Calendar className="size-4" />}
          {isAdded ? "구글 캘린더 추가됨" : "내 구글 캘린더에 추가"}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>구글 캘린더 (공유)</DialogTitle>
            <DialogDescription>
              {link.calendarName ? `캘린더: ${link.calendarName}` : "연결된 공유 캘린더"}
            </DialogDescription>
          </DialogHeader>
          {isAdded ? (
            <p className="text-sm text-muted-foreground">
              내 구글 캘린더 UI에 이 공유 캘린더가 표시되어 있습니다. 제거해도 권한은 유지되어
              언제든 다시 추가할 수 있습니다.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              이 캘린더를 내 구글 캘린더 UI에 추가하면 바로 일정을 볼 수 있습니다. 권한은 이미
              부여되어 있으며, 추가하지 않아도 앱 내 일정은 정상 이용 가능합니다.
            </p>
          )}
          {canSync && link.lastSyncedAt && (
            <p className="text-xs text-muted-foreground">
              마지막 반영: {new Date(link.lastSyncedAt).toLocaleString("ko-KR")}
            </p>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            <DialogClose className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              닫기
            </DialogClose>
            {canSync && (
              <Button size="sm" variant="outline" onClick={() => void handleSync()} disabled={busy}>
                다시 반영하기
              </Button>
            )}
            {isAdded ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleSubscribe("remove")}
                disabled={busy}
              >
                내 캘린더에서 제거
              </Button>
            ) : (
              <Button size="sm" onClick={() => void handleSubscribe("add")} disabled={busy}>
                내 구글 캘린더에 추가
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog>
      <DialogTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "gap-1.5",
          isRevoked && "text-destructive border-destructive/40"
        )}
      >
        {isRevoked ? <AlertTriangle className="size-4" /> : <Calendar className="size-4" />}
        {isRevoked ? "구글 캘린더 권한 회수됨" : "구글 캘린더 연결됨"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>구글 캘린더 (공유)</DialogTitle>
          <DialogDescription>
            {isRevoked
              ? "외부 계정의 권한이 회수되어 동기화가 중단되었습니다. 다시 연결해 복구하세요."
              : link.calendarName
                ? `캘린더: ${link.calendarName}`
                : "연결된 공유 캘린더"}
          </DialogDescription>
        </DialogHeader>
        <dl className="space-y-1 text-xs text-muted-foreground">
          {link.lastSyncedAt && (
            <div className="flex gap-1">
              <dt>마지막 반영:</dt>
              <dd className="text-foreground">{new Date(link.lastSyncedAt).toLocaleString("ko-KR")}</dd>
            </div>
          )}
          {link.skippedCount > 0 && (
            <div className="flex gap-1">
              <dt>직접 수정하여 건너뛴 이벤트:</dt>
              <dd className="text-foreground">{link.skippedCount}개 (덮어쓰지 않음)</dd>
            </div>
          )}
          {failed.length > 0 && (
            <div className="flex gap-1">
              <dt>실패:</dt>
              <dd className="text-foreground">{failed.length}개</dd>
            </div>
          )}
        </dl>
        <DialogFooter className="gap-2 flex-wrap">
          <DialogClose className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            닫기
          </DialogClose>
          {isRevoked ? (
            <Button
              size="sm"
              onClick={() => {
                window.location.href = `/api/gcal/consent?returnTo=/trips/${tripId}?gcal=sync-ready`;
              }}
              disabled={busy}
            >
              다시 연결하기
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => void handleSync()} disabled={busy}>
                다시 반영하기
              </Button>
              {failed.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleSync(failed.map((f) => f.activityId))}
                  disabled={busy}
                >
                  실패한 것만 재시도 ({failed.length})
                </Button>
              )}
            </>
          )}
          <Button size="sm" variant="outline" onClick={() => void handleUnlink()} disabled={busy}>
            연결 해제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
