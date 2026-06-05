"use client";

/**
 * spec 056 — 외부 캘린더 가져오기 전용 다이얼로그.
 * spec 057 — 사용자 노출 카피 간소화(코드명·기술 설명 제거, 제목 + 한 줄 설명).
 *
 * 가져오기 인증 상태는 ImportSection이 /api/users/me/external-calendars로 자체 확인하므로
 * 별도 연결 상태에 의존하지 않는다.
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
            구글·애플 캘린더의 일정을 가져옵니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {canEdit ? (
            <div>
              <ImportSection
                tripId={tripId}
                role={role}
                onImported={handleDraftMutated}
              />
            </div>
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
