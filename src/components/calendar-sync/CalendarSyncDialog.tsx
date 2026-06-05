"use client";

/**
 * spec 056 — 외부 캘린더 가져오기 전용 다이얼로그.
 *
 * trip-planner는 외부 캘린더에 쓰지 않고 가져오기(읽기)만 지원한다(SSOT 단방향).
 * 과거의 연결/동기화 표면(ProviderSection)은 제거하고 가져오기·초안만 남긴다.
 * 가져오기 인증 상태는 ImportSection이 /api/users/me/external-calendars로 자체 확인하므로
 * 별도 연결 상태(export link)에 의존하지 않는다.
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

interface Props {
  tripId: number;
  role: TripRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** 가져오기 전용 안내 — trip-planner는 외부 캘린더에 쓰지 않는다(SSOT 단방향). */
export function ImportOnlyNotice() {
  return (
    <div className="bg-muted/40 text-muted-foreground rounded-lg border p-3 text-xs">
      <p>
        trip-planner는 외부 캘린더에서 일정을 <strong>가져오기만</strong> 하며,
        외부 캘린더에는 쓰지 않습니다. 여행 일정의 정본은 trip-planner입니다.
      </p>
      <p className="mt-1">
        과거에 외부 캘린더로 내보낸 항목이 남아 있다면, 외부
        캘린더(구글·애플)에서 직접 정리해 주세요.
      </p>
    </div>
  );
}

export default function CalendarSyncDialog({
  tripId,
  role,
  open,
  onOpenChange,
}: Props) {
  const [draftRefreshKey, setDraftRefreshKey] = useState(0);

  const handleDraftMutated = useCallback(() => {
    setDraftRefreshKey((k) => k + 1);
  }, []);

  const canEdit = role === "OWNER" || role === "HOST";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>외부 캘린더 가져오기</DialogTitle>
          <DialogDescription>
            외부 캘린더(구글·애플)의 일정을 trip-planner로 가져옵니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <ImportOnlyNotice />

          {canEdit ? (
            <details className="bg-card rounded-lg border p-3" open>
              <summary className="cursor-pointer text-sm font-semibold">
                외부 캘린더에서 일정 가져오기
              </summary>
              <p className="text-muted-foreground mt-1 text-xs">
                다른 캘린더에 이미 쌓아둔 일정을 trip-planner로 가져옵니다.
              </p>
              <div className="mt-3">
                <ImportSection
                  tripId={tripId}
                  role={role}
                  onImported={handleDraftMutated}
                />
              </div>
            </details>
          ) : (
            <p className="text-muted-foreground text-sm">
              외부 일정 가져오기는 호스트 이상 권한에서만 가능합니다.
            </p>
          )}

          {canEdit && (
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
