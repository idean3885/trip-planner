"use client";

/**
 * spec 028 — 단일 통합 다이얼로그.
 *
 * 섹션 1(연결 상태) · 섹션 2(가져오기) · 섹션 3(draft 목록)이 사용자 권한과 trip 캘린더
 * 상태에 따라 동적으로 자란다. 도메인 호출은 v2.15.x 엔드포인트 재사용.
 */

import { useCallback, useState } from "react";
import type { TripRole } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ProviderSection from "./sections/ProviderSection";
import ImportSection from "./sections/ImportSection";
import DraftSection from "./sections/DraftSection";

interface Props {
  tripId: number;
  role: TripRole;
  initialCalendarLinked: boolean;
  initialCalendarProvider: "GOOGLE" | "APPLE" | null;
  providerHint: "google" | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CalendarSyncDialog({
  tripId,
  role,
  initialCalendarLinked,
  initialCalendarProvider,
  providerHint,
  open,
  onOpenChange,
}: Props) {
  // 초기값은 server-rendered SidePanel로부터 받는다. 다이얼로그가 열린 동안의 갱신은
  // handleLinkChanged·handleDraftMutated 콜백이 처리.
  const [calendarLinked, setCalendarLinked] = useState(initialCalendarLinked);
  const [calendarProvider, setCalendarProvider] = useState(initialCalendarProvider);
  const [draftRefreshKey, setDraftRefreshKey] = useState(0);

  const handleLinkChanged = useCallback(
    (next: { linked: boolean; provider: "GOOGLE" | "APPLE" | null }) => {
      setCalendarLinked(next.linked);
      setCalendarProvider(next.provider);
    },
    [],
  );

  const handleDraftMutated = useCallback(() => {
    setDraftRefreshKey((k) => k + 1);
  }, []);

  const canEdit = role === "OWNER" || role === "HOST";
  const showImport = calendarLinked && canEdit;
  const showDrafts = calendarLinked;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>외부 캘린더 동기화</DialogTitle>
          <DialogDescription>
            여행 캘린더 연결과 외부 일정 가져오기를 한 화면에서 처리합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <ProviderSection
            tripId={tripId}
            role={role}
            linked={calendarLinked}
            provider={calendarProvider}
            providerHint={providerHint}
            onLinkChanged={handleLinkChanged}
          />

          {showImport && (
            <ImportSection
              tripId={tripId}
              role={role}
              onImported={handleDraftMutated}
            />
          )}

          {showDrafts && (
            <DraftSection
              key={draftRefreshKey}
              tripId={tripId}
              canEdit={canEdit}
              onMutated={handleDraftMutated}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
