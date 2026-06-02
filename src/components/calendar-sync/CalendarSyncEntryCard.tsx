/**
 * spec 028 → spec 043 US3 — 캘린더 동기화 진입 버튼.
 *
 * trip 상세 캘린더 동선의 단일 진입점. 과거 진입 "카드 + [열기]" 2단계를 없애고,
 * 액션바의 버튼 한 번으로 통합 다이얼로그(연결·가져오기·초안)를 바로 연다.
 */

"use client";

import type { TripRole } from "@prisma/client";
import { CalendarSync } from "lucide-react";
import { useState } from "react";

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

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CalendarSync className="size-4" />
        캘린더 동기화
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
    </>
  );
}
