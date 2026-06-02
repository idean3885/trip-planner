"use client";

/**
 * spec 028 — 단일 통합 다이얼로그.
 *
 * 섹션 1(연결 상태) · 섹션 2(가져오기) · 섹션 3(draft 목록)이 사용자 권한과 trip 캘린더
 * 상태에 따라 동적으로 자란다. 도메인 호출은 v2.15.x 엔드포인트 재사용.
 */

import type { TripRole } from "@prisma/client";
import { useCallback, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import DraftSection from "./sections/DraftSection";
import ImportSection from "./sections/ImportSection";
import ProviderSection from "./sections/ProviderSection";

interface Props {
  tripId: number;
  role: TripRole;
  initialCalendarLinked: boolean;
  initialCalendarProvider: "GOOGLE" | "APPLE" | null;
  initialCalendarName: string | null;
  providerHint: "google" | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CalendarSyncDialog({
  tripId,
  role,
  initialCalendarLinked,
  initialCalendarProvider,
  initialCalendarName,
  providerHint,
  open,
  onOpenChange,
}: Props) {
  const [calendarLinked, setCalendarLinked] = useState(initialCalendarLinked);
  const [calendarProvider, setCalendarProvider] = useState(
    initialCalendarProvider,
  );
  const [calendarName, setCalendarName] = useState(initialCalendarName);
  const [draftRefreshKey, setDraftRefreshKey] = useState(0);

  const handleLinkChanged = useCallback(
    (next: {
      linked: boolean;
      provider: "GOOGLE" | "APPLE" | null;
      name: string | null;
    }) => {
      setCalendarLinked(next.linked);
      setCalendarProvider(next.provider);
      setCalendarName(next.name);
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
            calendarName={calendarName}
            providerHint={providerHint}
            onLinkChanged={handleLinkChanged}
          />

          {showImport && (
            <details className="bg-card rounded-lg border p-3">
              <summary className="cursor-pointer text-sm font-semibold">
                외부 캘린더에서 일정 가져오기 (선택)
              </summary>
              <p className="text-muted-foreground mt-1 text-xs">
                trip-planner 일정은 위 캘린더로 자동 push됩니다. 다른 캘린더에
                이미 쌓아둔 일정을 가져오고 싶을 때만 사용하세요.
              </p>
              <div className="mt-3">
                <ImportSection
                  tripId={tripId}
                  role={role}
                  onImported={handleDraftMutated}
                />
              </div>
            </details>
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
