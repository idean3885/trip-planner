/**
 * spec 025 (#417, hotfix v2.11.5) — Apple 연결된 trip의 상태 카드.
 *
 * v2.11.5에서 미연결 케이스는 CalendarProviderChoice가 담당. 본 카드는
 * link.provider === "APPLE"일 때만 표시.
 *
 * 해제·재인증 UI는 v2.12 통합 패널에서 제공 예정.
 */

import { Card } from "@/components/ui/card";

export default function AppleEntryCard() {
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
