"use client";

/**
 * spec 027 — 외부 캘린더 import 진입 패널.
 *
 * trip 상세 SidePanel에 노출. HOST 이상 권한 사용자만 import 버튼 사용 가능.
 * 1) 외부 캘린더 목록 fetch
 * 2) 사용자가 1개 선택
 * 3) 가져오기 실행 → 결과 토스트 + 페이지 새로고침
 */

import type { CalendarProviderId, TripRole } from "@prisma/client";
import { CalendarPlus, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExternalCalendar {
  provider: CalendarProviderId;
  externalCalendarId: string;
  displayName: string | null;
  accountLabel: string | null;
  isManagedByTripPlanner: boolean;
}

interface Diagnostics {
  unfilteredCount: number;
  managedFilteredCount: number;
  notConnected: CalendarProviderId[];
  scopeInsufficient: CalendarProviderId[];
  errors: { provider: CalendarProviderId; message: string }[];
}

interface ImportResultPayload {
  importRunId: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  failedTitles: string[];
}

const PROVIDER_LABEL: Record<CalendarProviderId, string> = {
  GOOGLE: "Google",
  APPLE: "Apple",
};

export default function CalendarImportPanel({
  tripId,
  role,
}: {
  tripId: number;
  role: TripRole;
}) {
  const canImport = role === "OWNER" || role === "HOST";
  const [open, setOpen] = useState(false);
  const [calendars, setCalendars] = useState<ExternalCalendar[] | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const loadCalendars = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/users/me/external-calendars", {
        cache: "no-store",
      });
      if (!res.ok) {
        setCalendars([]);
        setDiagnostics(null);
        return;
      }
      const data = (await res.json()) as {
        calendars: ExternalCalendar[];
        diagnostics?: Diagnostics;
      };
      setCalendars(data.calendars);
      setDiagnostics(data.diagnostics ?? null);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next && calendars === null) loadCalendars();
      if (!next) setSelected(null);
    },
    [calendars, loadCalendars],
  );

  const handleImport = useCallback(async () => {
    if (!selected) return;
    const target = calendars?.find((c) => c.externalCalendarId === selected);
    if (!target) return;

    setRunning(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/calendar-import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: target.provider,
          externalCalendarId: target.externalCalendarId,
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (res.status === 409 && body?.error === "external_account_not_linked") {
        toast.error("캘린더 계정 미연결", {
          description: "외부 캘린더 계정을 먼저 연결하세요.",
          action: {
            label: "연결하기",
            onClick: () => {
              window.location.href = body.settingsPath ?? "/settings/calendars";
            },
          },
        });
        return;
      }
      if (!res.ok) {
        toast.error("가져오기 실패", {
          description: body?.message ?? `오류 코드: ${res.status}`,
        });
        return;
      }

      const result = body as ImportResultPayload;
      const lines = [
        `가져옴 ${result.importedCount}건`,
        `건너뜀 ${result.skippedCount}건`,
      ];
      if (result.failedCount > 0) {
        lines.push(`실패 ${result.failedCount}건`);
      }
      toast.success("외부 캘린더 가져오기 완료", {
        description: lines.join(" · "),
      });
      setOpen(false);
      // draft 패널 갱신을 위해 페이지 새로고침
      window.location.reload();
    } finally {
      setRunning(false);
    }
  }, [calendars, selected, tripId]);

  if (!canImport) return null;

  const importable = (calendars ?? []).filter((c) => !c.isManagedByTripPlanner);
  const hasManaged = (calendars ?? []).some((c) => c.isManagedByTripPlanner);

  return (
    <section className="bg-card rounded-lg border p-4 shadow-sm">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <CalendarPlus className="size-4" />
        외부 캘린더에서 일정 가져오기
      </h3>
      <p className="text-muted-foreground mb-3 text-xs">
        다른 캘린더에 쌓아둔 일정을 이 여행의 초안으로 가져옵니다. 매핑 안 되는
        정보는 비어 있는 상태로 들어옵니다.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleOpenChange(true)}
      >
        가져오기 시작
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>외부 캘린더 선택</DialogTitle>
            <DialogDescription>
              여행 기간과 겹치는 일정만 가져옵니다. 같은 이벤트는 다시 눌러도
              중복으로 들어오지 않습니다.
            </DialogDescription>
          </DialogHeader>

          {loadingList && (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" /> 목록 불러오는 중…
            </p>
          )}

          {!loadingList && importable.length === 0 && (
            <div className="space-y-2 text-sm">
              {diagnostics?.scopeInsufficient?.includes("GOOGLE") ? (
                <>
                  <p className="font-medium">
                    Google 캘린더 권한이 부족합니다.
                  </p>
                  <p className="text-muted-foreground text-xs">
                    이전에 받은 권한이 일정 읽기·쓰기에 한정되어 캘린더 목록을
                    가져올 수 없습니다. 다시 동의해주세요.
                  </p>
                  <a
                    href={`/api/gcal/consent?returnTo=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}
                    className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-90"
                  >
                    Google 다시 연결
                  </a>
                </>
              ) : diagnostics?.notConnected?.length === 2 ? (
                <>
                  <p className="font-medium">캘린더 계정 미연결</p>
                  <p className="text-muted-foreground text-xs">
                    Google 또는 Apple 캘린더 계정을 trip-planner에 먼저
                    연결하세요.
                  </p>
                  <a
                    href="/settings/calendars"
                    className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-90"
                  >
                    Apple 연결하기
                  </a>
                </>
              ) : hasManaged ? (
                <>
                  <p>가져올 수 있는 외부 캘린더가 없습니다.</p>
                  <p className="text-muted-foreground text-xs">
                    본인 계정의 모든 캘린더가 trip-planner 관리 캘린더로
                    분류되어 제외됐습니다.
                  </p>
                </>
              ) : (
                <>
                  <p>가져올 수 있는 외부 캘린더가 없습니다.</p>
                  <p className="text-muted-foreground text-xs">
                    Google 또는 Apple 계정에 trip-planner 외 캘린더를 만든 뒤
                    다시 시도하세요.
                  </p>
                </>
              )}
              {diagnostics?.errors && diagnostics.errors.length > 0 && (
                <details className="text-muted-foreground text-xs">
                  <summary>진단 정보</summary>
                  <ul className="mt-1 space-y-0.5">
                    {diagnostics.errors.map((e, i) => (
                      <li key={i}>
                        {e.provider}: {e.message}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          {!loadingList && importable.length > 0 && (
            <ul className="space-y-2">
              {importable.map((c) => (
                <li key={`${c.provider}:${c.externalCalendarId}`}>
                  <label className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <input
                      type="radio"
                      name="external-calendar"
                      value={c.externalCalendarId}
                      checked={selected === c.externalCalendarId}
                      onChange={() => setSelected(c.externalCalendarId)}
                    />
                    <span className="flex-1">
                      <span className="font-medium">
                        {c.displayName ?? "(이름 없음)"}
                      </span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {PROVIDER_LABEL[c.provider]}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              disabled={running}
              onClick={() => handleOpenChange(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleImport}
              disabled={!selected || running || importable.length === 0}
            >
              {running ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  가져오는 중…
                </>
              ) : (
                "가져오기"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
