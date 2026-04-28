"use client";

/**
 * spec 025 (#417, hotfix v2.11.6 #458) — Apple 연결된 trip의 상태·sync 패널.
 *
 * 표시 분기:
 *  - OWNER/HOST → 마지막 sync 시각 + skipped/lastError + "다시 반영하기" 버튼
 *  - GUEST → 안내만(편집 불가, sync 트리거 권한 없음)
 *
 * 동작:
 *  - 마운트 시 GET /api/v2/trips/[id]/calendar 로 status 조회
 *  - "다시 반영하기" → POST /api/v2/trips/[id]/calendar/sync
 *    · service.syncCalendar가 link.provider="APPLE" 분기로 syncAppleActivities 호출
 *    · auth_invalid 응답 시 위자드 재인증 링크 노출(?apple_reauth=1)
 *
 * 해제·재연결 UI는 v2.12 통합 패널에서 제공 예정.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { TripRole } from "@prisma/client";
import type { SyncResponse, SyncSummary } from "@/types/gcal";

interface AppleEntryCardProps {
  tripId: number;
  role: TripRole;
}

interface StatusBody {
  linked: boolean;
  link?: {
    calendarName: string | null;
    lastSyncedAt: string | null;
    lastError: string | null;
    skippedCount: number;
  };
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function summarize(s: SyncSummary): string {
  const parts: string[] = [];
  if (s.created) parts.push(`추가 ${s.created}`);
  if (s.updated) parts.push(`갱신 ${s.updated}`);
  if (s.deleted) parts.push(`삭제 ${s.deleted}`);
  if (s.skipped) parts.push(`건너뜀 ${s.skipped}`);
  if (s.failed) parts.push(`실패 ${s.failed}`);
  return parts.length ? parts.join(" · ") : "변경 없음";
}

export default function AppleEntryCard({ tripId, role }: AppleEntryCardProps) {
  const router = useRouter();
  const canTrigger = role === "OWNER" || role === "HOST";
  const [status, setStatus] = useState<StatusBody | null>(null);
  const [busy, setBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    const res = await fetch(`/api/v2/trips/${tripId}/calendar`);
    if (!res.ok) return;
    const body = (await res.json()) as StatusBody;
    setStatus(body);
  }, [tripId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  async function handleSync() {
    setBusy(true);
    try {
      const res = await fetch(`/api/v2/trips/${tripId}/calendar/sync`, {
        method: "POST",
      });
      if (res.status === 409) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          reauthUrl?: string;
        };
        if (data.error === "apple_not_authenticated") {
          toast.error(
            "Apple 자격증명이 만료되었습니다. 위자드에서 재인증해 주세요.",
          );
          if (data.reauthUrl) {
            router.push(data.reauthUrl);
          }
          return;
        }
      }
      if (!res.ok) {
        toast.error("다시 반영에 실패했습니다");
        return;
      }
      const data = (await res.json()) as SyncResponse;
      const message = summarize(data.summary);
      if (data.status === "ok") {
        toast.success(`최신 상태로 반영했습니다 · ${message}`);
      } else {
        toast.warning(`부분 반영 · ${message}`);
      }
      await loadStatus();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "네트워크 오류가 발생했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Apple 캘린더 연결됨</h3>
          {status?.link && (
            <p className="text-xs text-muted-foreground">
              마지막 반영: {formatDateTime(status.link.lastSyncedAt)}
              {status.link.skippedCount > 0 && (
                <span className="ml-2">건너뜀 {status.link.skippedCount}건</span>
              )}
              {status.link.lastError && (
                <span className="ml-2 text-amber-700">
                  · 오류: {status.link.lastError}
                </span>
              )}
            </p>
          )}
          {!status?.link && (
            <p className="text-xs text-muted-foreground">
              iPhone·iPad·Mac Calendar 앱에서 본 여행 일정을 확인할 수 있습니다.
            </p>
          )}
        </div>
        {canTrigger && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleSync}
            disabled={busy}
          >
            {busy ? "반영 중…" : "다시 반영하기"}
          </Button>
        )}
      </div>

      {/* 인증 만료 시 위자드 재진입 보조 링크 (모든 role 표시) */}
      {status?.link?.lastError === "REVOKED" && (
        <p className="mt-3 text-xs">
          <Link
            href={`/trips/${tripId}/calendar/connect-apple?apple_reauth=1`}
            className="text-primary underline underline-offset-2"
          >
            Apple 자격증명 재인증 →
          </Link>
        </p>
      )}
    </Card>
  );
}
