import type { ReactNode } from "react";

/**
 * spec — 여행 상세 부가 정보 묶음(#645).
 *
 * 동행자(위)와 외부 캘린더 동기화(아래)를 하나로 묶어 순서·간격을 한곳에서
 * 정한다. 모바일 "자세히" 다이얼로그 본문으로 쓴다. 두 영역은 각각 독립
 * 컴포넌트(MemberList / CalendarSyncEntryCard)지만 이 상위가 함께 배치한다.
 */
export function TripDetailExtras({
  members,
  sync,
}: {
  members: ReactNode;
  sync: ReactNode;
}) {
  return (
    <div className="space-y-6">
      {members}
      {sync}
    </div>
  );
}
