"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import GCalCalendarChoice from "@/components/GCalCalendarChoice";
import type {
  CalendarType,
  FailedItem,
  StatusResponse,
  SyncResponse,
  UnlinkResponse,
} from "@/types/gcal";

interface Props {
  tripId: number;
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
export default function GCalLinkPanel({ tripId }: Props) {
  const [state, setState] = useState<LocalState>({ phase: "loading" });
  const [choice, setChoice] = useState<CalendarType>("DEDICATED");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<FailedItem[]>([]);

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

  // 동의 완료 후 복귀 시 자동 연동 실행
  useEffect(() => {
    if (typeof window === "undefined") return;
    const qp = new URLSearchParams(window.location.search);
    if (qp.get("gcal") === "link-ready") {
      qp.delete("gcal");
      window.history.replaceState(null, "", `${window.location.pathname}`);
      void handleLink("DEDICATED");
    } else if (qp.get("gcal") === "sync-ready") {
      qp.delete("gcal");
      window.history.replaceState(null, "", `${window.location.pathname}`);
      void handleSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  async function handleLink(calendarType: CalendarType) {
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

  async function handleUnlink() {
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
    return (
      <Card size="sm">
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">구글 캘린더 연결</h3>
            <p className="text-xs text-muted-foreground">
              이 여행 일정을 내 구글 캘린더에 이벤트로 만들어 한눈에 볼 수 있습니다.
            </p>
          </div>
          <GCalCalendarChoice value={choice} onChange={setChoice} />
        </CardContent>
        <CardFooter>
          <Button size="sm" onClick={() => void handleLink(choice)} disabled={busy}>
            구글 캘린더에 올리기
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const link = status.link;
  const isRevoked = link.lastError === "REVOKED";

  return (
    <Card size="sm">
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">구글 캘린더</h3>
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
