/**
 * spec 028 — SidePanel 진입 카드.
 *
 * trip 상세의 캘린더 관련 모든 동선의 유일한 진입점. 카드 클릭 시 단일 다이얼로그가 열린다.
 */

"use client";

import type { TripRole } from "@prisma/client";
import { CalendarSync } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";

import CalendarSyncDialog from "./CalendarSyncDialog";

/** ?calsync=open 진입 시 자동 다이얼로그 오픈 — lazy initial state로 effect 회피. */
function initialOpenFromUrl(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("calsync") === "open";
}

interface Props {
  tripId: number;
  role: TripRole;
  calendarLinked: boolean;
  calendarProvider: "GOOGLE" | "APPLE" | null;
  calendarName: string | null;
  providerHint: "google" | null;
}

export default function CalendarSyncEntryCard({
  tripId,
  role,
  calendarLinked,
  calendarProvider,
  calendarName,
  providerHint,
}: Props) {
  const [open, setOpen] = useState<boolean>(initialOpenFromUrl);

  const providerLabel =
    calendarProvider === "APPLE" ? "Apple iCloud" : "Google";
  const summary = calendarLinked
    ? calendarName
      ? `${providerLabel} · ${calendarName} 연결됨`
      : `${providerLabel} 캘린더 연결됨`
    : "캘린더 연결 안 됨";

  const description =
    role === "GUEST"
      ? "이 여행의 캘린더 상태와 가져온 일정을 확인할 수 있습니다."
      : "여행 캘린더 연결, 외부 캘린더에서 일정 가져오기, 초안 관리까지 한 화면에서 처리합니다.";

  const handleOpen = useCallback(() => setOpen(true), []);

  return (
    <section className="bg-card rounded-lg border p-4 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <CalendarSync className="size-4" />
        외부 캘린더 동기화
      </h3>
      <p className="text-muted-foreground mt-1 text-xs">{summary}</p>
      <p className="text-muted-foreground mt-2 text-xs">{description}</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={handleOpen}>
        열기
      </Button>
      <CalendarSyncDialog
        tripId={tripId}
        role={role}
        initialCalendarLinked={calendarLinked}
        initialCalendarProvider={calendarProvider}
        initialCalendarName={calendarName}
        providerHint={providerHint}
        open={open}
        onOpenChange={setOpen}
      />
    </section>
  );
}
