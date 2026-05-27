import MemberList from "@/components/MemberList";
import CalendarSyncEntryCard from "@/components/calendar-sync/CalendarSyncEntryCard";
import type { TripRole } from "@prisma/client";

/**
 * spec 028(v2.16.0) — SidePanel에서 캘린더 관련은 단일 진입 카드 `CalendarSyncEntryCard`로만
 * 노출. 기존 5종 패널(`CalendarProviderChoice`, `GCalLinkPanel`, `AppleEntryCard`,
 * `CalendarImportPanel`, `DraftListPanel`)은 통합 다이얼로그 내부 섹션으로 이동했다.
 */
export default function SidePanel({
  tripId,
  role,
  hasCalendarLink,
  calendarProvider,
  calendarName,
  providerHint,
}: {
  tripId: number;
  role: TripRole;
  hasCalendarLink: boolean;
  calendarProvider: "GOOGLE" | "APPLE" | null;
  calendarName: string | null;
  providerHint: "google" | null;
}) {
  return (
    <aside className="space-y-6">
      <CalendarSyncEntryCard
        tripId={tripId}
        role={role}
        calendarLinked={hasCalendarLink}
        calendarProvider={calendarProvider}
        calendarName={calendarName}
        providerHint={providerHint}
      />
      <MemberList tripId={tripId} />
    </aside>
  );
}
