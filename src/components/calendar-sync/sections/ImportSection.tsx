"use client";

/**
 * spec 028 섹션 2 — 외부 캘린더에서 일정 가져오기.
 *
 * v2.15.1 `CalendarImportPanel` 의 진단 분기·캘린더 선택·import 실행을 inline 으로 흡수.
 * 다이얼로그를 닫지 않고 같은 영역에서 결과를 보여준다.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { TripRole, CalendarProviderId } from "@prisma/client";

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

interface Props {
  tripId: number;
  role: TripRole;
  onImported: () => void;
}

export default function ImportSection({ tripId, role, onImported }: Props) {
  const canImport = role === "OWNER" || role === "HOST";

  const [calendars, setCalendars] = useState<ExternalCalendar[] | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [running, setRunning] = useState(false);

  const loadCalendars = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/users/me/external-calendars", { cache: "no-store" });
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

  useEffect(() => {
    if (canImport) loadCalendars();
  }, [canImport, loadCalendars]);

  const importable = (calendars ?? []).filter((c) => !c.isManagedByTripPlanner);
  const hasManaged = (calendars ?? []).some((c) => c.isManagedByTripPlanner);

  const notConnected = diagnostics?.notConnected ?? [];
  const scopeInsufficient = diagnostics?.scopeInsufficient ?? [];
  const googleScopeInsufficient = scopeInsufficient.includes("GOOGLE");
  const googleNotConnected = notConnected.includes("GOOGLE") && !googleScopeInsufficient;
  const appleNotConnected = notConnected.includes("APPLE");
  const hasConnectionGap = googleScopeInsufficient || googleNotConnected || appleNotConnected;
  const googleConsentHref = `/api/gcal/consent?returnTo=${encodeURIComponent(`/trips/${tripId}?calsync=open`)}`;

  const handleImport = useCallback(async () => {
    if (!selected) return;
    const target = importable.find((c) => c.externalCalendarId === selected);
    if (!target) return;
    setRunning(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/calendar-import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: target.provider, externalCalendarId: target.externalCalendarId }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 409 && body?.error === "external_account_not_linked") {
        toast.error("캘린더 계정 미연결", {
          description: "설정에서 외부 캘린더 계정을 먼저 연결하세요.",
          action: {
            label: "설정 열기",
            onClick: () => {
              window.location.href = body.settingsPath ?? "/settings/calendars";
            },
          },
        });
        return;
      }
      if (!res.ok) {
        toast.error("가져오기 실패", { description: body?.message ?? `오류 코드: ${res.status}` });
        return;
      }
      const result = body as ImportResultPayload;
      const lines = [`가져옴 ${result.importedCount}건`, `건너뜀 ${result.skippedCount}건`];
      if (result.failedCount > 0) lines.push(`실패 ${result.failedCount}건`);
      toast.success("외부 캘린더 가져오기 완료", { description: lines.join(" · ") });
      onImported();
      setSelected(null);
      await loadCalendars();
    } finally {
      setRunning(false);
    }
  }, [importable, loadCalendars, onImported, selected, tripId]);

  // 헤더·일반 안내는 통합 다이얼로그(CalendarSyncDialog)의 <details> summary가 담당.
  // 본 섹션은 캘린더 목록·진단 분기·실행 버튼만 그린다.
  if (!canImport) {
    return (
      <p className="text-xs text-muted-foreground">
        호스트 이상 권한에서만 외부 일정을 가져올 수 있습니다. 가져오기가 끝난 초안은 아래에서 확인할 수 있습니다.
      </p>
    );
  }

  return (
    <div className="space-y-3">

      {loadingList && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> 목록 불러오는 중…
        </p>
      )}

      {!loadingList && hasConnectionGap && (
        <div className="space-y-2">
          {googleScopeInsufficient && (
            <div className="space-y-2 rounded-md border p-3 text-sm">
              <p className="font-medium">Google 캘린더 권한이 부족합니다.</p>
              <p className="text-xs text-muted-foreground">
                이전에 받은 권한이 일정 읽기·쓰기에 한정되어 캘린더 목록을 가져올 수 없습니다. 다시 동의해주세요.
              </p>
              <a
                href={googleConsentHref}
                className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                Google 다시 연결
              </a>
            </div>
          )}
          {googleNotConnected && (
            <div className="space-y-2 rounded-md border p-3 text-sm">
              <p className="font-medium">Google 캘린더 미연결</p>
              <p className="text-xs text-muted-foreground">
                Google 계정 OAuth 동의로 연결합니다.
              </p>
              <a
                href={googleConsentHref}
                className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                Google 연결
              </a>
            </div>
          )}
          {appleNotConnected && (
            <div className="space-y-2 rounded-md border p-3 text-sm">
              <p className="font-medium">Apple 캘린더 미연결</p>
              <p className="text-xs text-muted-foreground">
                Apple은 OAuth를 지원하지 않습니다. 설정에서 Apple ID와 앱 비밀번호를 등록하세요.
              </p>
              <a
                href="/settings/calendars"
                className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                Apple 연결 설정
              </a>
            </div>
          )}
        </div>
      )}

      {!loadingList && importable.length === 0 && !hasConnectionGap && (
        <div className="space-y-2 text-sm">
          {hasManaged ? (
            <>
              <p>가져올 수 있는 외부 캘린더가 없습니다.</p>
              <p className="text-xs text-muted-foreground">
                본인 계정의 모든 캘린더가 trip-planner 관리 캘린더로 분류되어 제외됐습니다.
              </p>
            </>
          ) : (
            <>
              <p>가져올 수 있는 외부 캘린더가 없습니다.</p>
              <p className="text-xs text-muted-foreground">
                Google 또는 Apple 계정에 trip-planner 외 캘린더를 만든 뒤 다시 시도하세요.
              </p>
            </>
          )}
        </div>
      )}

      {!loadingList && importable.length > 0 && (
        <div className="space-y-3">
          <ul className="space-y-2">
            {importable.map((c) => (
              <li key={`${c.provider}:${c.externalCalendarId}`}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
                  <input
                    type="radio"
                    name="ext-calendar"
                    value={c.externalCalendarId}
                    checked={selected === c.externalCalendarId}
                    onChange={() => setSelected(c.externalCalendarId)}
                  />
                  <span className="flex-1">
                    <span className="font-medium">{c.displayName ?? "(이름 없음)"}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {PROVIDER_LABEL[c.provider]}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <Button onClick={handleImport} disabled={!selected || running}>
            {running ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                가져오는 중…
              </>
            ) : (
              "가져오기"
            )}
          </Button>
        </div>
      )}

      {!loadingList && diagnostics?.errors && diagnostics.errors.length > 0 && (
        <details className="text-xs text-muted-foreground">
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
  );
}
