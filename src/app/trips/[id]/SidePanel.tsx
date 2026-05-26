import MemberList from "@/components/MemberList";
import GCalLinkPanel from "@/components/GCalLinkPanel";
import AppleEntryCard from "@/components/calendar/AppleEntryCard";
import CalendarProviderChoice from "@/components/calendar/CalendarProviderChoice";
import type { TripRole } from "@prisma/client";

/**
 * spec 026 묶음 B — 데스크탑(≥1024px) 사이드 패널.
 *
 * trip 상세의 캘린더 패널 + 멤버 목록을 우측 1/3 영역으로 분리.
 * 모바일은 본 컴포넌트가 본문 흐름 안에 단순히 세로로 쌓인다(layout-id/page.tsx 그리드 분기가 단일 컬럼이 되므로 자동 처리).
 */
export default function SidePanel({
  tripId,
  role,
  hasCalendarLink,
  calendarProvider,
  providerHint,
}: {
  tripId: number;
  role: TripRole;
  hasCalendarLink: boolean;
  calendarProvider: "GOOGLE" | "APPLE" | null;
  providerHint: "google" | null;
}) {
  const showProviderChoice = !hasCalendarLink && role === "OWNER" && !providerHint;
  const showGcal = calendarProvider === "GOOGLE" || providerHint === "google";
  const showApple = calendarProvider === "APPLE";

  return (
    <aside className="space-y-6">
      {showProviderChoice && <CalendarProviderChoice tripId={tripId} />}
      {showGcal && <GCalLinkPanel tripId={tripId} role={role} />}
      {showApple && <AppleEntryCard tripId={tripId} role={role} />}
      <MemberList tripId={tripId} />
    </aside>
  );
}
