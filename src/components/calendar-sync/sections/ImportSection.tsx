"use client";

/**
 * spec 028 섹션 2 — 외부 캘린더에서 일정 가져오기.
 *
 * v2.15.1 `CalendarImportPanel` 의 진단 분기·캘린더 선택·import 실행을 inline 으로 흡수.
 * 다이얼로그를 닫지 않고 같은 영역에서 결과를 보여준다.
 */

import type { CalendarProviderId, TripRole } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

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

  useEffect(() => {
    if (canImport) loadCalendars();
  }, [canImport, loadCalendars]);

  const importable = (calendars ?? []).filter((c) => !c.isManagedByTripPlanner);

  const notConnected = diagnostics?.notConnected ?? [];
  const scopeInsufficient = diagnostics?.scopeInsufficient ?? [];
  const googleScopeInsufficient = scopeInsufficient.includes("GOOGLE");
  const googleNotConnected =
    notConnected.includes("GOOGLE") && !googleScopeInsufficient;
  const appleNotConnected = notConnected.includes("APPLE");
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
      track("calendar_import", { provider: target.provider }); // spec 057 — 핵심 전환(가져오기 실행)
      const lines = [
        `가져옴 ${result.importedCount}건`,
        `건너뜀 ${result.skippedCount}건`,
      ];
      if (result.failedCount > 0) lines.push(`실패 ${result.failedCount}건`);
      toast.success("외부 캘린더 가져오기 완료", {
        description: lines.join(" · "),
      });
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
      <p className="text-muted-foreground text-xs">
        호스트 이상 권한에서만 외부 일정을 가져올 수 있습니다. 가져오기가 끝난
        초안은 아래에서 확인할 수 있습니다.
      </p>
    );
  }

  // spec 058 — provider(애플·구글)별 섹션으로 분리해 어느 영역인지 분명히 한다.
  // 각 섹션은 자기 provider 의 미연결 안내 / 가져올 캘린더 목록 / 빈 안내를 자기 안에서
  // 그린다. 선택·가져오기는 두 섹션을 가로지르는 단일 라디오 그룹 + 하단 단일 버튼.
  const PROVIDER_SECTIONS: { id: CalendarProviderId; title: string }[] = [
    { id: "APPLE", title: "Apple 캘린더" },
    { id: "GOOGLE", title: "Google 캘린더" },
  ];

  const renderProviderBody = (pid: CalendarProviderId) => {
    if (pid === "GOOGLE" && googleScopeInsufficient) {
      return (
        <div className="space-y-2 rounded-md border p-3 text-sm">
          <p className="text-muted-foreground text-xs">
            이전에 받은 권한이 일정 읽기·쓰기에 한정되어 캘린더 목록을 가져올 수
            없습니다. 다시 동의해주세요.
          </p>
          <a
            href={googleConsentHref}
            className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-90"
          >
            Google 다시 연결
          </a>
        </div>
      );
    }
    if (pid === "GOOGLE" && googleNotConnected) {
      return (
        <div className="space-y-2 rounded-md border p-3 text-sm">
          <p className="text-muted-foreground text-xs">
            Google 계정 OAuth 동의로 연결합니다.
          </p>
          <a
            href={googleConsentHref}
            className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-90"
          >
            Google 연결
          </a>
        </div>
      );
    }
    if (pid === "APPLE" && appleNotConnected) {
      return (
        <div className="space-y-2 rounded-md border p-3 text-sm">
          <p className="text-muted-foreground text-xs">
            Apple은 OAuth를 지원하지 않습니다. Apple ID와 앱 비밀번호를 직접
            등록하세요.
          </p>
          <a
            href="/settings/calendars"
            className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-90"
          >
            Apple 연결하기
          </a>
        </div>
      );
    }
    const list = importable.filter((c) => c.provider === pid);
    if (list.length === 0) {
      return (
        <p className="text-muted-foreground text-xs">
          가져올 수 있는 캘린더가 없습니다.
        </p>
      );
    }
    return (
      <ul className="space-y-2">
        {list.map((c) => (
          <li key={`${c.provider}:${c.externalCalendarId}`}>
            <label className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <input
                type="radio"
                name="ext-calendar"
                value={c.externalCalendarId}
                checked={selected === c.externalCalendarId}
                onChange={() => setSelected(c.externalCalendarId)}
              />
              <span className="flex-1 font-medium">
                {c.displayName ?? "(이름 없음)"}
              </span>
            </label>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="space-y-4">
      {loadingList && (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" /> 목록 불러오는 중…
        </p>
      )}

      {!loadingList &&
        PROVIDER_SECTIONS.map((p) => (
          <section key={p.id} className="space-y-2">
            <h4 className="text-foreground text-sm font-semibold tracking-tight">
              {p.title}
            </h4>
            {renderProviderBody(p.id)}
          </section>
        ))}

      {!loadingList && importable.length > 0 && (
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
      )}

      {!loadingList && diagnostics?.errors && diagnostics.errors.length > 0 && (
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
  );
}
