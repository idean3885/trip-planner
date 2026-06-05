/**
 * spec 028 → spec 043 US3 → spec 056 — 캘린더 가져오기 진입 버튼.
 *
 * trip 상세 캘린더 동선의 단일 진입점. 액션바의 버튼 한 번으로 가져오기 전용
 * 다이얼로그(가져오기·초안)를 연다. spec 056에서 내보내기/동기화 표면을 제거하고
 * 가져오기 전용으로 재정의했다(SSOT 단방향).
 */

"use client";

import type { TripRole } from "@prisma/client";
import { CalendarArrowDown } from "lucide-react";
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
}

export default function CalendarSyncEntryCard({ tripId, role }: Props) {
  const [open, setOpen] = useState<boolean>(initialOpenFromUrl);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CalendarArrowDown className="size-4" />
        캘린더 가져오기
      </Button>
      <CalendarSyncDialog
        tripId={tripId}
        role={role}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
