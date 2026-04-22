"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
      <Card size="sm">
        <CardContent className="text-sm text-muted-foreground">{state.message}</CardContent>
      </Card>
    );
  }

  const status = state.status;

  if (!status.linked) {
    if (!isOwner) {
      return (
        <Card size="sm">
          <CardContent className="space-y-2">
            <h3 className="text-sm font-semibold">구글 캘린더 연결</h3>
            <p className="text-xs text-muted-foreground">
              오너가 아직 공유 캘린더를 연결하지 않았습니다.
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card size="sm">
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">구글 캘린더 연결</h3>
            <p className="text-xs text-muted-foreground">
              이 여행의 공유 캘린더를 만들고 호스트·게스트에게 자동으로 권한을 부여합니다.
              구글에서 공유 알림 메일이 발송될 수 있습니다.
            </p>
          </div>
          {/* v2.9.0: PRIMARY 공유 불가 — DEDICATED 전용. 선택 UI는 숨김. */}
        </CardContent>
        <CardFooter>
          <Button size="sm" onClick={() => void handleLink(choice)} disabled={busy}>
            공유 캘린더 연결
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const link = status.link;
  const isRevoked = link.lastError === "REVOKED";

  if (!isOwner) {
    // 호스트·게스트: 본인 subscribe 상태에 따라 컴팩트(추가됨) / 안내(미추가) 카드로 분기.
    const sub = status.mySubscription;
    const isAdded = sub?.status === "ADDED";

    if (isAdded) {
      // 추가 완료 상태 — 오너 쪽 "연결됨" 카드처럼 컴팩트하게 유지.
      return (
        <Card size="sm">
          <CardContent className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">구글 캘린더 (공유)</h3>
              <span className="text-[11px] rounded px-1.5 py-0.5 bg-emerald-100 text-emerald-700">
                내 캘린더에 추가됨
              </span>
            </div>
            {link.calendarName && (
              <p className="text-xs text-muted-foreground">
                캘린더: <span className="text-foreground">{link.calendarName}</span>
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void handleSubscribe("remove")}
              disabled={busy}
            >
              내 캘린더에서 제거
            </Button>
          </CardFooter>
        </Card>
      );
    }

    // 미추가 / 에러 상태 — 안내 + 추가 버튼.
    return (
      <Card size="sm">
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">구글 캘린더 (공유)</h3>
            <span className="text-[11px] rounded px-1.5 py-0.5 bg-emerald-100 text-emerald-700">
              연결됨
            </span>
          </div>
          {link.calendarName && (
            <p className="text-xs text-muted-foreground">
              캘린더: <span className="text-foreground">{link.calendarName}</span>
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            이 캘린더를 내 구글 캘린더 UI에 추가하면 바로 일정을 볼 수 있습니다. 권한은 이미
            부여되어 있으며, 추가하지 않아도 앱 내 일정은 정상 이용 가능합니다.
          </p>
        </CardContent>
        <CardFooter>
          <Button size="sm" onClick={() => void handleSubscribe("add")} disabled={busy}>
            내 구글 캘린더에 추가
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card size="sm">
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">구글 캘린더 (공유)</h3>
          <span
            className={`text-[11px] rounded px-1.5 py-0.5 ${isRevoked ? "bg-destructive/10 text-destructive" : "bg-emerald-100 text-emerald-700"}`}
          >
            {isRevoked ? "권한 회수됨" : "연결됨"}
          </span>
        </div>
        <dl className="space-y-1 text-xs text-muted-foreground">
          {link.calendarName && (
            <div className="flex gap-1">
              <dt>캘린더:</dt>
              <dd className="text-foreground">{link.calendarName}</dd>
            </div>
          )}
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
      </CardContent>
      <CardFooter className="gap-2">
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
        <Button size="sm" variant="ghost" onClick={() => void handleUnlink()} disabled={busy}>
          연결 해제
        </Button>
      </CardFooter>
    </Card>
  );
}
