"use client";

/**
 * spec 025 (#417, hotfix v2.11.1+v2.11.4) — trip 페이지의 Apple 캘린더 진입 카드.
 *
 * 표시 분기 (spec 024 Clarification 6 — 한 trip = 1 provider 정책):
 *  - 미연결 (currentProvider == null) + OWNER → "Apple 캘린더 연결 (Beta)" 버튼
 *  - GOOGLE 연결됨 → 카드 자체를 hide (사용자가 Google 패널에서 먼저 해제하도록 유도)
 *  - APPLE 연결됨 → "Apple 캘린더 연결됨" 안내 카드 (해제 UI는 v2.12 후속)
 *  - GUEST/HOST → 카드 hide (connectAppleCalendar는 OWNER 전용)
 *
 * v2.12 통합: Google·Apple 패널을 단일 컴포넌트로 통합 + 해제·전환 흐름 일원화 예정.
 */

import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { CalendarProviderId, TripRole } from "@prisma/client";

interface AppleEntryCardProps {
  tripId: number;
  role: TripRole;
  /** 해당 trip의 현재 link.provider. 미연결이면 null. */
  currentProvider: CalendarProviderId | null;
}

export default function AppleEntryCard({
  tripId,
  role,
  currentProvider,
}: AppleEntryCardProps) {
  if (role !== "OWNER") return null;

  // 다른 provider(GOOGLE)에 이미 연결됨 → 카드 hide.
  // 사용자는 Google 패널에서 해제 후 Apple 시도. 같은 trip 페이지에 두 가지 진입을
  // 동시에 노출하면 spec 024 Clarification 6의 "1 provider" 정책과 사용자 기대가
  // 어긋난다(2026-04-28 dev 검증 피드백 — already_linked_other_provider 좌절).
  if (currentProvider && currentProvider !== "APPLE") {
    return null;
  }

  if (currentProvider === "APPLE") {
    return (
      <Card className="p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Apple 캘린더 연결됨</h3>
          <p className="text-xs text-muted-foreground">
            iPhone·iPad·Mac Calendar 앱에서 본 여행 일정을 확인할 수 있습니다.
            연결 해제·재인증 UI는 후속 회차에서 제공 예정입니다.
          </p>
        </div>
      </Card>
    );
  }

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
