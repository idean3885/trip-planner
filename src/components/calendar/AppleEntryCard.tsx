"use client";

/**
 * spec 025 (#417, hotfix v2.11.1) — trip 페이지에 Apple 캘린더 위자드 진입 카드.
 *
 * 위자드 페이지 자체(`/trips/[id]/calendar/connect-apple`)는 v2.11.0에서 도입됐지만
 * 진입 UI가 없어 사용자가 직접 URL을 입력해야 했다. 본 카드를 trip 페이지에 노출해
 * OWNER가 한 번에 진입할 수 있도록 한다.
 *
 * 연결 후 상태 표시·해제 UI는 v2.12에서 정식 패널로 분리 예정.
 */

import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { TripRole } from "@prisma/client";

interface AppleEntryCardProps {
  tripId: number;
  role: TripRole;
}

export default function AppleEntryCard({ tripId, role }: AppleEntryCardProps) {
  if (role !== "OWNER") return null;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Apple 캘린더 연결 (Beta)</h3>
          <p className="text-xs text-muted-foreground">
            iPhone·iPad·Mac Calendar 앱에서 여행 일정을 보고 싶다면 Apple ID + 16자리
            앱 전용 암호로 연결할 수 있습니다. 위자드가 발급·입력을 안내합니다.
          </p>
        </div>
        <Link
          href={`/trips/${tripId}/calendar/connect-apple`}
          className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Apple 연결
        </Link>
      </div>
    </Card>
  );
}
